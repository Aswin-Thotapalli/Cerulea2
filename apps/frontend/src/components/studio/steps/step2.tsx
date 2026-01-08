// FILE: src/components/studio/steps/step2.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Tab,
  Tabs,
  Typography,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  Tooltip,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useRouter } from "next/navigation";

import RelationshipCanvas, { Relationship } from "../logic/RelationshipCanvas";
import LogicCanvas from "../logic/LogicCanvas";
import CustomScriptPanel from "../custom/CustomScriptPanel";

type TabKey = "fields" | "relationships" | "logic" | "script";

type FieldType =
  | "string"
  | "text"
  | "uuid"
  | "int"
  | "float"
  | "boolean"
  | "date"
  | "datetime"
  | "json";

type Field = {
  id: string;
  name: string;
  type: FieldType;
  required: boolean;
  unique: boolean;
  indexed: boolean;
  apiExposed: boolean;
  pii: boolean;
  encrypted: boolean;
  onChain: boolean;
  immutable: boolean;
  description: string;
  defaultValue: string;
};

export type Entity = {
  id: string;
  name: string;
  fields: Field[];
};

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

const typeOptions: { value: FieldType; label: string }[] = [
  { value: "uuid", label: "uuid" },
  { value: "string", label: "string" },
  { value: "text", label: "text" },
  { value: "int", label: "int" },
  { value: "float", label: "float" },
  { value: "boolean", label: "boolean" },
  { value: "date", label: "date" },
  { value: "datetime", label: "datetime" },
  { value: "json", label: "json" },
];

export default function Step2({
  goPrev,
  goNext,
}: {
  goPrev?: () => void;
  goNext?: () => void;
}) {
  const router = useRouter();

  // Keep navigation behavior consistent with Step 1:
  // prefer goPrev/goNext when provided by the Studio shell.
  const handleBack = () => {
    if (goPrev) return goPrev();
    router.back();
  };

  const handleNext = () => {
    if (goNext) return goNext();
    router.push("/studio/step3");
  };

  const [tab, setTab] = useState<TabKey>("fields");

  const [entities, setEntities] = useState<Entity[]>(() => {
    const e: Entity = {
      id: uid("ent"),
      name: "NewEntity",
      fields: [
        {
          id: uid("fld"),
          name: "id",
          type: "uuid",
          required: true,
          unique: true,
          indexed: true,
          apiExposed: true,
          pii: false,
          encrypted: false,
          onChain: false,
          immutable: true,
          description: "",
          defaultValue: "",
        },
        {
          id: uid("fld"),
          name: "createdAt",
          type: "datetime",
          required: true,
          unique: false,
          indexed: true,
          apiExposed: true,
          pii: false,
          encrypted: false,
          onChain: false,
          immutable: true,
          description: "",
          defaultValue: "",
        },
      ],
    };
    return [e];
  });

  const [selectedEntityId, setSelectedEntityId] = useState<string>(() => entities[0]?.id ?? "");
  useEffect(() => {
    if (!selectedEntityId && entities[0]?.id) setSelectedEntityId(entities[0].id);
  }, [selectedEntityId, entities]);

  const selectedEntity = useMemo(
    () => entities.find((e) => e.id === selectedEntityId) ?? null,
    [entities, selectedEntityId]
  );

  // Relationships are now owned by Step2 and passed into RelationshipCanvas.
  const [relationships, setRelationships] = useState<Relationship[]>([]);

  // Keep relationships valid when entities change (remove edges that reference deleted entities)
  useEffect(() => {
    const valid = new Set(entities.map((e) => e.id));
    setRelationships((prev) => prev.filter((r) => valid.has(r.from) && valid.has(r.to)));
  }, [entities]);

  const selectMenuProps = useMemo(
    () => ({
      PaperProps: {
        sx: {
          bgcolor: "rgba(10,12,18,0.995)", // dropdown opacity increased (as before)
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(10px)",
          borderRadius: 2,
        },
      },
    }),
    []
  );

  const addEntity = useCallback(() => {
    const next: Entity = {
      id: uid("ent"),
      name: "NewEntity",
      fields: [
        {
          id: uid("fld"),
          name: "id",
          type: "uuid",
          required: true,
          unique: true,
          indexed: true,
          apiExposed: true,
          pii: false,
          encrypted: false,
          onChain: false,
          immutable: true,
          description: "",
          defaultValue: "",
        },
        {
          id: uid("fld"),
          name: "createdAt",
          type: "datetime",
          required: true,
          unique: false,
          indexed: true,
          apiExposed: true,
          pii: false,
          encrypted: false,
          onChain: false,
          immutable: true,
          description: "",
          defaultValue: "",
        },
      ],
    };
    setEntities((prev) => [...prev, next]);
    setSelectedEntityId(next.id);
  }, []);

  const deleteEntity = useCallback(
    (id: string) => {
      setEntities((prev) => {
        const filtered = prev.filter((e) => e.id !== id);
        return filtered.length ? filtered : prev;
      });
      if (selectedEntityId === id) {
        const remaining = entities.filter((e) => e.id !== id);
        setSelectedEntityId(remaining[0]?.id ?? "");
      }
    },
    [selectedEntityId, entities]
  );

  const updateEntityName = useCallback(
    (name: string) => {
      if (!selectedEntity) return;
      setEntities((prev) => prev.map((e) => (e.id === selectedEntity.id ? { ...e, name } : e)));
    },
    [selectedEntity]
  );

  const addField = useCallback(() => {
    if (!selectedEntity) return;
    const f: Field = {
      id: uid("fld"),
      name: "newField",
      type: "string",
      required: false,
      unique: false,
      indexed: false,
      apiExposed: true,
      pii: false,
      encrypted: false,
      onChain: false,
      immutable: false,
      description: "",
      defaultValue: "",
    };
    setEntities((prev) =>
      prev.map((e) => (e.id === selectedEntity.id ? { ...e, fields: [...e.fields, f] } : e))
    );
  }, [selectedEntity]);

  const deleteField = useCallback(
    (fieldId: string) => {
      if (!selectedEntity) return;
      setEntities((prev) =>
        prev.map((e) =>
          e.id === selectedEntity.id ? { ...e, fields: e.fields.filter((f) => f.id !== fieldId) } : e
        )
      );
    },
    [selectedEntity]
  );

  const updateField = useCallback(
    (fieldId: string, patch: Partial<Field>) => {
      if (!selectedEntity) return;
      setEntities((prev) =>
        prev.map((e) => {
          if (e.id !== selectedEntity.id) return e;
          return {
            ...e,
            fields: e.fields.map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
          };
        })
      );
    },
    [selectedEntity]
  );

  return (
    <Box
      sx={{
        minHeight: "calc(100vh - 64px)",
        px: 4,
        py: 3,
      }}
    >
      {/* Header row with Back (left) and Next (right) */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <IconButton
            onClick={handleBack}
            sx={{
              border: "1px solid rgba(255,255,255,0.10)",
              bgcolor: "rgba(10,12,18,0.35)",
              backdropFilter: "blur(10px)",
            }}
          >
            <ArrowBackIcon />
          </IconButton>

          <Typography variant="h5" sx={{ fontWeight: 900 }}>
            Data & Logic Editor
          </Typography>
        </Stack>

        <Button
          variant="outlined"
          onClick={handleNext}
          sx={{
            borderRadius: 999,
            px: 3,
            fontWeight: 900,
            borderColor: "rgba(59,130,246,0.5)",
            bgcolor: "rgba(59,130,246,0.08)",
          }}
        >
          Next
        </Button>
      </Stack>

      <Divider sx={{ mb: 2, opacity: 0.2 }} />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          "& .MuiTab-root": {
            textTransform: "none",
            fontWeight: 800,
          },
        }}
      >
        <Tab value="fields" label="FIELDS" />
        <Tab value="relationships" label="RELATIONSHIPS" />
        <Tab value="logic" label="LOGIC & ACTIONS" />
        <Tab value="script" label="CUSTOM SCRIPT" />
      </Tabs>

      <Divider sx={{ mt: 1.5, opacity: 0.18 }} />

      {/* FIELDS TAB */}
      {tab === "fields" && (
        <Stack direction="row" spacing={3} sx={{ mt: 3 }}>
          {/* ENTITIES LIST */}
          <Box
            sx={{
              width: 360,
              borderRadius: 5,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
              bgcolor: "rgba(10,12,18,0.38)",
              backdropFilter: "blur(18px)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
            }}
          >
            {/* header (padding adjusted so text doesn't clip rounded corners) */}
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2.5, py: 2 }}>
              <Typography sx={{ fontWeight: 900, pl: 0.5 }}>Entities</Typography>
              <Tooltip title="Add entity">
                <IconButton
                  onClick={addEntity}
                  sx={{
                    border: "1px solid rgba(59,130,246,0.30)",
                    bgcolor: "rgba(59,130,246,0.14)",
                  }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Stack>

            <Divider sx={{ opacity: 0.12 }} />

            <Box sx={{ maxHeight: "calc(100vh - 310px)", overflowY: "auto", px: 2, py: 2 }}>
              <Stack spacing={1.25}>
                {entities.map((e) => {
                  const active = e.id === selectedEntityId;
                  return (
                    <Box
                      key={e.id}
                      onClick={() => setSelectedEntityId(e.id)}
                      sx={{
                        cursor: "pointer",
                        borderRadius: 999,
                        border: active
                          ? "1px solid rgba(59,130,246,0.55)"
                          : "1px solid rgba(255,255,255,0.12)",
                        bgcolor: active ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.04)",
                        px: 2,
                        py: 1.5,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 900 }}>{e.name}</Typography>
                        <Typography sx={{ opacity: 0.7, fontSize: 12 }}>
                          {e.fields.length} fields
                        </Typography>
                      </Box>

                      <IconButton
                        onClick={(ev) => {
                          ev.stopPropagation();
                          deleteEntity(e.id);
                        }}
                        sx={{
                          border: "1px solid rgba(255,255,255,0.10)",
                          bgcolor: "rgba(255,255,255,0.04)",
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          </Box>

          {/* FIELDS EDITOR */}
          <Box
            sx={{
              flex: 1,
              borderRadius: 5,
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.12)",
              bgcolor: "rgba(10,12,18,0.38)",
              backdropFilter: "blur(18px)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
            }}
          >
            <Box sx={{ px: 3, py: 2.25 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography sx={{ fontWeight: 900 }}>Fields</Typography>
                <Button
                  onClick={addField}
                  startIcon={<AddIcon />}
                  sx={{
                    borderRadius: 999,
                    bgcolor: "rgba(59,130,246,0.18)",
                    border: "1px solid rgba(59,130,246,0.35)",
                    fontWeight: 900,
                    px: 2.5,
                  }}
                >
                  Add Field
                </Button>
              </Stack>

              <Divider sx={{ my: 2, opacity: 0.12 }} />

              {selectedEntity && (
                <Stack spacing={2.5}>
                  <TextField
                    label="Entity Name"
                    value={selectedEntity.name}
                    onChange={(e) => updateEntityName(e.target.value)}
                    fullWidth
                    size="small"
                    sx={{ "& .MuiInputBase-root": { borderRadius: 999 } }}
                  />

                  <Box sx={{ maxHeight: "calc(100vh - 360px)", overflowY: "auto", pr: 1 }}>
                    <Stack spacing={2}>
                      {selectedEntity.fields.map((f) => (
                        <Box
                          key={f.id}
                          sx={{
                            borderRadius: 4,
                            border: "1px solid rgba(255,255,255,0.12)",
                            bgcolor: "rgba(255,255,255,0.04)",
                            p: 2,
                          }}
                        >
                          <Stack direction="row" spacing={2} alignItems="center">
                            <TextField
                              label="Name"
                              value={f.name}
                              onChange={(e) => updateField(f.id, { name: e.target.value })}
                              fullWidth
                              size="small"
                              sx={{ "& .MuiInputBase-root": { borderRadius: 999 } }}
                            />

                            <FormControl size="small" sx={{ minWidth: 180 }}>
                              <InputLabel>Type</InputLabel>
                              <Select
                                label="Type"
                                value={f.type}
                                onChange={(e) => updateField(f.id, { type: e.target.value as FieldType })}
                                MenuProps={selectMenuProps}
                                sx={{ borderRadius: 999 }}
                              >
                                {typeOptions.map((t) => (
                                  <MenuItem key={t.value} value={t.value}>
                                    {t.label}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>

                            <IconButton
                              onClick={() => deleteField(f.id)}
                              sx={{
                                border: "1px solid rgba(255,255,255,0.10)",
                                bgcolor: "rgba(255,255,255,0.04)",
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Stack>

                          <Stack direction="row" spacing={2} sx={{ mt: 1 }} flexWrap="wrap">
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={f.required}
                                  onChange={(e) => updateField(f.id, { required: e.target.checked })}
                                />
                              }
                              label="Required"
                            />
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={f.unique}
                                  onChange={(e) => updateField(f.id, { unique: e.target.checked })}
                                />
                              }
                              label="Unique"
                            />
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={f.indexed}
                                  onChange={(e) => updateField(f.id, { indexed: e.target.checked })}
                                />
                              }
                              label="Indexed"
                            />
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={f.apiExposed}
                                  onChange={(e) => updateField(f.id, { apiExposed: e.target.checked })}
                                />
                              }
                              label="API exposed"
                            />
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={f.pii}
                                  onChange={(e) => updateField(f.id, { pii: e.target.checked })}
                                />
                              }
                              label="PII"
                            />
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={f.encrypted}
                                  onChange={(e) => updateField(f.id, { encrypted: e.target.checked })}
                                />
                              }
                              label="Encrypted"
                            />
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={f.onChain}
                                  onChange={(e) => updateField(f.id, { onChain: e.target.checked })}
                                />
                              }
                              label="On-chain"
                            />
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={f.immutable}
                                  onChange={(e) => updateField(f.id, { immutable: e.target.checked })}
                                />
                              }
                              label="Immutable"
                            />
                          </Stack>

                          <Stack direction="row" spacing={2} sx={{ mt: 1.25 }}>
                            <TextField
                              label="Description"
                              value={f.description}
                              onChange={(e) => updateField(f.id, { description: e.target.value })}
                              fullWidth
                              size="small"
                              sx={{ "& .MuiInputBase-root": { borderRadius: 999 } }}
                            />
                            <TextField
                              label="Default"
                              value={f.defaultValue}
                              onChange={(e) => updateField(f.id, { defaultValue: e.target.value })}
                              sx={{ width: 220, "& .MuiInputBase-root": { borderRadius: 999 } }}
                              size="small"
                            />
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                </Stack>
              )}
            </Box>
          </Box>
        </Stack>
      )}

      {/* RELATIONSHIPS TAB */}
      {tab === "relationships" && (
        <Box sx={{ mt: 3 }}>
          <RelationshipCanvas
            entities={entities.map((e) => ({ id: e.id, name: e.name }))}
            relationships={relationships}
            setRelationships={setRelationships}
          />
        </Box>
      )}

      {/* LOGIC TAB */}
      {tab === "logic" && (
        <Box sx={{ mt: 3 }}>
          <LogicCanvas />
        </Box>
      )}

      {/* CUSTOM SCRIPT TAB */}
      {tab === "script" && (
        <Box sx={{ mt: 3 }}>
          <CustomScriptPanel />
        </Box>
      )}
    </Box>
  );
}
