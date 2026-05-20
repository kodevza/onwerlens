param(
  [string]$OutputPath = ".\data\entra-snapshot.json"
)

if (-not (Get-Command Get-MgContext -ErrorAction SilentlyContinue)) {
  throw "Microsoft Graph PowerShell module missing. Install: Install-Module Microsoft.Graph -Scope CurrentUser"
}

$context = Get-MgContext

if (-not $context) {
  throw 'Not connected. Run: Connect-MgGraph -TenantId "<tenant-id>" -Scopes "Application.Read.All","Group.Read.All","Directory.Read.All"'
}

$snapshot = [ordered]@{
  meta = [ordered]@{
    provider = "entra"
    snapshotVersion = "0.3"
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
    tenantId = $context.TenantId
    account = $context.Account
    scopes = $context.Scopes
  }
  servicePrincipals = @()
  oauth2PermissionGrants = @()
  appRoleAssignments = @()
  groups = @()
}

function Get-DirectoryObjectSnapshotValue {
  param(
    [Parameter(Mandatory = $true)]
    $DirectoryObject,

    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  $value = $DirectoryObject.$Name

  if ($null -ne $value) {
    return $value
  }

  $camelName = $Name.Substring(0, 1).ToLowerInvariant() + $Name.Substring(1)
  if (-not $DirectoryObject.AdditionalProperties) {
    return $null
  }

  return $DirectoryObject.AdditionalProperties[$camelName]
}

function ConvertTo-OwnerSnapshot {
  param(
    [Parameter(Mandatory = $true)]
    $Owner
  )

  [pscustomobject]@{
    id = Get-DirectoryObjectSnapshotValue -DirectoryObject $Owner -Name "Id"
    displayName = Get-DirectoryObjectSnapshotValue -DirectoryObject $Owner -Name "DisplayName"
    userPrincipalName = Get-DirectoryObjectSnapshotValue -DirectoryObject $Owner -Name "UserPrincipalName"
    mail = Get-DirectoryObjectSnapshotValue -DirectoryObject $Owner -Name "Mail"
    ownerType = if ($Owner.AdditionalProperties) { $Owner.AdditionalProperties["@odata.type"] } else { $null }
  }
}

$servicePrincipals = Get-MgServicePrincipal `
  -All `
  -Property Id,AppId,DisplayName,ServicePrincipalType,PublisherName,AccountEnabled,AppOwnerOrganizationId,AppDisplayName,Homepage,LoginUrl,ReplyUrls,ServicePrincipalNames,Tags,AppRoles

$servicePrincipalById = @{}

foreach ($sp in $servicePrincipals) {
  $servicePrincipalById[$sp.Id] = $sp
}

foreach ($sp in $servicePrincipals) {
  $servicePrincipalOwners = @(
    Get-MgServicePrincipalOwner `
      -ServicePrincipalId $sp.Id `
      -All `
      -Property Id,DisplayName,UserPrincipalName,Mail |
      ForEach-Object { ConvertTo-OwnerSnapshot -Owner $_ }
  )

  $snapshot.servicePrincipals += [pscustomobject]@{
    id = $sp.Id
    appId = $sp.AppId
    displayName = $sp.DisplayName
    appDisplayName = $sp.AppDisplayName
    servicePrincipalType = $sp.ServicePrincipalType
    publisherName = $sp.PublisherName
    accountEnabled = $sp.AccountEnabled
    appOwnerOrganizationId = $sp.AppOwnerOrganizationId
    homepage = $sp.Homepage
    loginUrl = $sp.LoginUrl
    replyUrls = $sp.ReplyUrls
    servicePrincipalNames = $sp.ServicePrincipalNames
    tags = $sp.Tags
    servicePrincipalOwners = $servicePrincipalOwners
    appRoles = @(
      $sp.AppRoles | ForEach-Object {
        [pscustomobject]@{
          id = $_.Id
          value = $_.Value
          displayName = $_.DisplayName
          description = $_.Description
          isEnabled = $_.IsEnabled
          allowedMemberTypes = $_.AllowedMemberTypes
        }
      }
    )
  }
}

$oauth2PermissionGrants = Get-MgOauth2PermissionGrant -All

foreach ($grant in $oauth2PermissionGrants) {
  $snapshot.oauth2PermissionGrants += [pscustomobject]@{
    id = $grant.Id
    clientId = $grant.ClientId
    consentType = $grant.ConsentType
    principalId = $grant.PrincipalId
    resourceId = $grant.ResourceId
    scope = $grant.Scope
  }
}

foreach ($sp in $servicePrincipals) {
  $assignments = Get-MgServicePrincipalAppRoleAssignment `
    -ServicePrincipalId $sp.Id `
    -All

  foreach ($assignment in $assignments) {
    $resourceServicePrincipal = $servicePrincipalById[$assignment.ResourceId]
    $appRole = $null

    if ($resourceServicePrincipal -and $resourceServicePrincipal.AppRoles) {
      $appRole = $resourceServicePrincipal.AppRoles | Where-Object { [string]$_.Id -eq [string]$assignment.AppRoleId } | Select-Object -First 1
    }

    $snapshot.appRoleAssignments += [pscustomobject]@{
      id = $assignment.Id
      appRoleId = $assignment.AppRoleId
      appRoleDisplayName = if ($appRole) { $appRole.DisplayName } else { $null }
      appRoleValue = if ($appRole) { $appRole.Value } else { $null }
      principalId = $assignment.PrincipalId
      principalDisplayName = $assignment.PrincipalDisplayName
      resourceId = $assignment.ResourceId
      resourceDisplayName = $assignment.ResourceDisplayName
    }
  }
}

$groups = Get-MgGroup `
  -All `
  -Property Id,DisplayName,Description,Mail,MailEnabled,SecurityEnabled,GroupTypes,ProxyAddresses,Visibility

foreach ($group in $groups) {
  $members = Get-MgGroupMember `
    -GroupId $group.Id `
    -All

  $memberEmails = @(
    $members | ForEach-Object {
      $mail = $_.AdditionalProperties["mail"]
      $userPrincipalName = $_.AdditionalProperties["userPrincipalName"]

      if ($mail) {
        $mail
      } elseif ($userPrincipalName) {
        $userPrincipalName
      }
    } | Where-Object { $_ } | Select-Object -Unique
  )

  $snapshot.groups += [pscustomobject]@{
    id = $group.Id
    displayName = $group.DisplayName
    description = $group.Description
    mail = $group.Mail
    mailEnabled = $group.MailEnabled
    securityEnabled = $group.SecurityEnabled
    groupTypes = $group.GroupTypes
    proxyAddresses = $group.ProxyAddresses
    visibility = $group.Visibility
    memberEmails = $memberEmails
    memberEmailCount = $memberEmails.Count
  }
}

$snapshot.meta.servicePrincipalCount = $snapshot.servicePrincipals.Count
$snapshot.meta.oauth2PermissionGrantCount = $snapshot.oauth2PermissionGrants.Count
$snapshot.meta.appRoleAssignmentCount = $snapshot.appRoleAssignments.Count
$snapshot.meta.groupCount = $snapshot.groups.Count

$outputDirectory = Split-Path -Parent $OutputPath
if (-not [string]::IsNullOrWhiteSpace($outputDirectory) -and -not (Test-Path $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$snapshot | ConvertTo-Json -Depth 20 | Out-File $OutputPath -Encoding utf8
