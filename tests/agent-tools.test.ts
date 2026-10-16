import { describe, it, expect } from "vitest";
import {
  AGENT_TOOLS,
  ToolInputError,
  findTool,
  toAnthropicTools,
  toolsForGrants,
} from "@/lib/agents/tools";
import { CAPABILITIES, type StoreAccessGrant } from "@/lib/auth/capabilities";
import { AGENT_SKILLS, isSkillAvailable } from "@/lib/agents/permissions";

const tool = (name: string) => {
  const found = findTool(name);
  if (!found) throw new Error(`missing tool ${name}`);
  return found;
};

describe("agent tool registry", () => {
  it("exposes unique tool names", () => {
    const names = AGENT_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("maps every tool to a declared, available skill", () => {
    for (const t of AGENT_TOOLS) {
      expect(isSkillAvailable(t.skillKey)).toBe(true);
    }
  });

  it("requires a capability on every tool", () => {
    const known = Object.values(CAPABILITIES) as string[];
    for (const t of AGENT_TOOLS) {
      expect(known).toContain(t.requiredCapability);
    }
  });

  it("publishes closed input schemas to Anthropic, so the model cannot smuggle extra fields", () => {
    for (const published of toAnthropicTools(AGENT_TOOLS)) {
      expect(published.input_schema).toMatchObject({ type: "object", additionalProperties: false });
    }
  });

  it("does not expose a tool for a skill that is not connected", () => {
    const unavailable = AGENT_SKILLS.filter((s) => !s.available).map((s) => s.key);
    for (const t of AGENT_TOOLS) {
      expect(unavailable).not.toContain(t.skillKey);
    }
  });
});

describe("tool access by capability", () => {
  const readOnly: StoreAccessGrant[] = [{ storeId: "store-a", capabilities: ["store:read"] }];
  const withOrders: StoreAccessGrant[] = [
    { storeId: "store-a", capabilities: ["store:read", "orders:read"] },
  ];

  it("hides order tools from a user with only store:read", () => {
    const names = toolsForGrants(readOnly, "store-a").map((t) => t.name);
    expect(names).toContain("buscar_oportunidades_guardadas");
    expect(names).not.toContain("listar_ordenes");
    expect(names).not.toContain("problemas_fulfillment");
  });

  it("includes order tools once orders:read is granted", () => {
    const names = toolsForGrants(withOrders, "store-a").map((t) => t.name);
    expect(names).toContain("listar_ordenes");
    expect(names).toContain("problemas_fulfillment");
  });

  it("grants nothing for a store the user has no access to", () => {
    expect(toolsForGrants(withOrders, "store-b")).toHaveLength(0);
  });

  it("does not leak a capability granted on another store", () => {
    const grants: StoreAccessGrant[] = [
      { storeId: "store-a", capabilities: ["store:read", "orders:read"] },
      { storeId: "store-b", capabilities: ["store:read"] },
    ];
    expect(toolsForGrants(grants, "store-b").map((t) => t.name)).not.toContain("listar_ordenes");
  });
});

describe("tool input validation", () => {
  it("rejects non-object arguments", () => {
    expect(() => tool("resumen_tienda").parseInput("30")).toThrow(ToolInputError);
    expect(() => tool("resumen_tienda").parseInput([1, 2])).toThrow(ToolInputError);
  });

  it("clamps an absurd time window instead of querying it", () => {
    expect(tool("resumen_tienda").parseInput({ dias: 99999 })).toEqual({ dias: 180 });
    expect(tool("resumen_tienda").parseInput({ dias: -5 })).toEqual({ dias: 1 });
  });

  it("defaults the window when the model omits it", () => {
    expect(tool("resumen_tienda").parseInput({})).toEqual({ dias: 30 });
  });

  it("rejects a non-numeric window", () => {
    expect(() => tool("resumen_tienda").parseInput({ dias: "un mes" })).toThrow(ToolInputError);
  });

  it("caps the result limit on opportunity search", () => {
    const parsed = tool("buscar_oportunidades_guardadas").parseInput({ limite: 500 });
    expect(parsed.limite).toBe(20);
  });

  it("rejects a margin outside 0-1", () => {
    expect(() =>
      tool("buscar_oportunidades_guardadas").parseInput({ margenMinimo: 40 })
    ).toThrow(ToolInputError);
  });

  it("rejects an unknown competition level", () => {
    expect(() =>
      tool("buscar_oportunidades_guardadas").parseInput({ competencia: "ninguna" })
    ).toThrow(ToolInputError);
  });

  it("drops filters the model left empty rather than filtering on them", () => {
    const parsed = tool("buscar_oportunidades_guardadas").parseInput({
      margenMinimo: "",
      competencia: "",
    });
    expect(parsed.margenMinimo).toBeUndefined();
    expect(parsed.competencia).toBeUndefined();
  });

  it("rejects an over-long search string", () => {
    expect(() => tool("listar_productos").parseInput({ busqueda: "x".repeat(500) })).toThrow(
      ToolInputError
    );
  });

  it("only accepts a literal true for boolean flags", () => {
    expect(tool("listar_productos").parseInput({ soloSinCosto: "si" }).soloSinCosto).toBe(false);
    expect(tool("listar_productos").parseInput({ soloSinCosto: true }).soloSinCosto).toBe(true);
  });

  it("ignores arguments on a tool that takes none", () => {
    expect(tool("estado_integraciones").parseInput({ storeId: "store-b" })).toEqual({});
  });

  it("never lets a tool argument carry a store id", () => {
    // El storeId siempre viene del servidor; ningún esquema lo acepta del modelo.
    for (const t of AGENT_TOOLS) {
      const properties = (t.inputSchema as { properties: Record<string, unknown> }).properties;
      expect(Object.keys(properties)).not.toContain("storeId");
    }
  });
});
