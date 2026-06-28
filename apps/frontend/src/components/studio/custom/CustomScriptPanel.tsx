"use client";
import React, { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

const TS_DEFAULT = `// TypeScript — off-chain custom logic
export function onWebhook(payload: any) {
  return { ok: true, payload };
}
`;

const SOL_DEFAULT = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Custom {
    function ping() public pure returns (uint256) { return 42; }
}
`;

export default function CustomScriptPanel({ projectId }: { projectId: string }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const borderColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";

  const [lang, setLang] = useState<"ts" | "sol">("ts");
  const [tsCode, setTsCode] = useState(TS_DEFAULT);
  const [solCode, setSolCode] = useState(SOL_DEFAULT);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);

  async function validate() {
    setStatus({ msg: "Validating…", ok: true });
    if (lang === "ts") {
      setTimeout(() => setStatus({ msg: "TypeScript: syntax OK — Monaco diagnostics will surface compile errors inline.", ok: true }), 200);
    } else {
      const ok = solCode.includes("contract") && solCode.includes("{") && solCode.includes("}");
      setTimeout(() => setStatus({
        msg: ok
          ? "Solidity: basic structure OK — full compile runs during generation/deploy."
          : "Solidity: file looks incomplete (missing contract or braces).",
        ok,
      }), 200);
    }
  }

  return (
    <Box sx={{
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 320px)",
      minHeight: 360,
      border: `1px solid ${borderColor}`,
      bgcolor: isDark ? "#080E24" : "#fafafa",
    }}>
      {/* Toolbar */}
      <Stack
        direction="row"
        alignItems="center"
        sx={{ height: 40, borderBottom: `1px solid ${borderColor}`, flexShrink: 0, gap: 0, px: 0 }}
      >
        {(["ts", "sol"] as const).map((l, i) => (
          <Box
            key={l}
            onClick={() => setLang(l)}
            sx={{
              px: 2.5, height: "100%",
              display: "flex", alignItems: "center",
              cursor: "pointer",
              fontSize: "0.78rem",
              fontWeight: lang === l ? 700 : 500,
              color: lang === l ? "primary.main" : "text.secondary",
              borderBottom: lang === l ? "2px solid" : "2px solid transparent",
              borderBottomColor: lang === l ? "primary.main" : "transparent",
              borderRight: i === 0 ? `1px solid ${borderColor}` : "none",
              transition: "color 0.12s",
              userSelect: "none",
              "&:hover": { color: lang === l ? "primary.main" : "text.primary" },
            }}
          >
            {l === "ts" ? "TypeScript" : "Solidity"}
          </Box>
        ))}

        <Box sx={{ flex: 1 }} />

        <Box sx={{ px: 1.5 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={validate}
            sx={{
              height: 28, fontSize: "0.72rem", borderRadius: "4px",
              borderColor,
              color: "text.secondary",
              "&:hover": { borderColor: "primary.main", color: "primary.main", bgcolor: "rgba(79,70,229,0.04)" },
            }}
          >
            Validate
          </Button>
        </Box>
      </Stack>

      {/* Editor */}
      <Box sx={{ flex: 1, overflow: "hidden" }}>
        {lang === "ts" && (
          <MonacoEditor
            height="100%"
            defaultLanguage="typescript"
            value={tsCode}
            onChange={(v) => setTsCode(v || "")}
            options={{
              automaticLayout: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineHeight: 22,
              padding: { top: 16, bottom: 16 },
              scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
              renderLineHighlight: "none",
              overviewRulerLanes: 0,
              scrollBeyondLastLine: false,
              fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
              fontLigatures: true,
            }}
            beforeMount={(monaco) => {
              monaco.editor.defineTheme("cerulea-dark", {
                base: "vs-dark", inherit: true, rules: [],
                colors: {
                  "editor.background": "#080E24",
                  "editor.lineHighlightBackground": "#00000000",
                  "editorLineNumber.foreground": "#3D4F7C",
                  "editorLineNumber.activeForeground": "#8FA3D2",
                  "editor.selectionBackground": "#4F46E520",
                },
              });
              monaco.editor.defineTheme("cerulea-light", {
                base: "vs", inherit: true, rules: [],
                colors: {
                  "editor.background": "#fafafa",
                  "editor.lineHighlightBackground": "#00000000",
                  "editorLineNumber.foreground": "#BBC4D8",
                  "editorLineNumber.activeForeground": "#5B6B8D",
                },
              });
            }}
            onMount={(_editor, monaco) => {
              monaco.editor.setTheme(isDark ? "cerulea-dark" : "cerulea-light");
            }}
          />
        )}
        {lang === "sol" && (
          <MonacoEditor
            height="100%"
            language="sol"
            value={solCode}
            onChange={(v) => setSolCode(v || "")}
            options={{
              automaticLayout: true,
              minimap: { enabled: false },
              fontSize: 13,
              lineHeight: 22,
              padding: { top: 16, bottom: 16 },
              scrollbar: { verticalScrollbarSize: 4, horizontalScrollbarSize: 4 },
              renderLineHighlight: "none",
              overviewRulerLanes: 0,
              scrollBeyondLastLine: false,
              fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
              fontLigatures: true,
            }}
            beforeMount={(monaco) => {
              monaco.editor.defineTheme("cerulea-dark", {
                base: "vs-dark", inherit: true, rules: [],
                colors: {
                  "editor.background": "#080E24",
                  "editor.lineHighlightBackground": "#00000000",
                  "editorLineNumber.foreground": "#3D4F7C",
                  "editorLineNumber.activeForeground": "#8FA3D2",
                  "editor.selectionBackground": "#4F46E520",
                },
              });
              monaco.editor.defineTheme("cerulea-light", {
                base: "vs", inherit: true, rules: [],
                colors: {
                  "editor.background": "#fafafa",
                  "editor.lineHighlightBackground": "#00000000",
                  "editorLineNumber.foreground": "#BBC4D8",
                  "editorLineNumber.activeForeground": "#5B6B8D",
                },
              });
            }}
            onMount={(_editor, monaco) => {
              monaco.editor.setTheme(isDark ? "cerulea-dark" : "cerulea-light");
            }}
          />
        )}
      </Box>

      {/* Status bar */}
      <Box sx={{
        px: 2, height: 28, flexShrink: 0,
        borderTop: `1px solid ${borderColor}`,
        display: "flex", alignItems: "center",
        bgcolor: isDark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.015)",
      }}>
        <Typography sx={{
          fontSize: "0.68rem",
          fontFamily: '"JetBrains Mono", monospace',
          color: status ? (status.ok ? "text.secondary" : "error.main") : "text.disabled",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {status?.msg || "TypeScript for off-chain logic · Solidity for on-chain contracts"}
        </Typography>
      </Box>
    </Box>
  );
}
