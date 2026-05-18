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
    snapshotVersion = "0.2"
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
    tenantId = $context.TenantId
    account = $context.Account
    scopes = $context.Scopes
  }
  servicePrincipals = @()
  groups = @()
}

$servicePrincipals = Get-MgServicePrincipal `
  -All `
  -Property Id,AppId,DisplayName,ServicePrincipalType,PublisherName,AccountEnabled,AppOwnerOrganizationId,AppDisplayName,Homepage,LoginUrl,ReplyUrls,ServicePrincipalNames,Tags

foreach ($sp in $servicePrincipals) {
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
$snapshot.meta.groupCount = $snapshot.groups.Count

$outputDirectory = Split-Path -Parent $OutputPath
if (-not [string]::IsNullOrWhiteSpace($outputDirectory) -and -not (Test-Path $outputDirectory)) {
  New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
}

$snapshot | ConvertTo-Json -Depth 10 | Out-File $OutputPath -Encoding utf8
