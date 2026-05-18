import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { EvidenceList } from "./EvidenceList.tsx";

test("renders evidence users and timestamps", () => {
  const html = renderToStaticMarkup(
    React.createElement(EvidenceList, {
      evidence: [
        {
          user: "owner@example.com",
          date: "2026-04-30T12:34:56.000Z"
        },
        {
          user: "ownerGroup=platform@example.com",
          date: null
        }
      ]
    })
  );

  expect(html).toMatch(/owner@example\.com/);
  expect(html).toMatch(/>2026-04-30T12:34:56\.000Z<\/time>/);
  expect(html).toMatch(/ownerGroup=platform@example\.com/);
});
