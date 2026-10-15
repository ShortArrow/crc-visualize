import { describe, expect, it } from "vitest";
import { generatorHash, narrowHash, parseRoute } from "./route";

describe("parseRoute", () => {
  it.each(["", "#", "#other"])("Given fragment %j, When determining the page, Then the visualization page", (hash) => {
    expect(parseRoute(hash)).toEqual({ page: "visualizer" });
  });

  it("Given fragment #names, When determining the page, Then the naming-rules page", () => {
    expect(parseRoute("#names")).toEqual({ page: "names" });
  });

  it("Given fragment #names/poly, When determining the page, Then the naming-rules page pointing to the poly row", () => {
    expect(parseRoute("#names/poly")).toEqual({ page: "names", param: "poly" });
  });

  it("Given fragment #names/foo pointing to something that is not a parameter name, When determining the page, Then the naming-rules page with no row pointed to", () => {
    expect(parseRoute("#names/foo")).toEqual({ page: "names" });
  });

  it("Given fragment #narrow, When determining the page, Then the narrowing page with an empty path", () => {
    expect(parseRoute("#narrow")).toEqual({ page: "narrow", path: { fixed: [] } });
  });

  it("Given fragment #narrow/width=16/poly=0x1021/init, When determining the page, Then it holds the fixed values and the open branch", () => {
    expect(parseRoute("#narrow/width=16/poly=0x1021/init")).toEqual({
      page: "narrow",
      path: {
        fixed: [
          { param: "width", value: 16 },
          { param: "poly", value: 0x1021 },
        ],
        open: "init",
      },
    });
  });

  it.each(["#narrow/width=16/foo=1/poly=0x1021", "#narrow/width=16/poly=abc", "#narrow/width=16/init/poly=0x1021"])(
    "Given fragment %s containing an unparsable part, When determining the page, Then the path up to just before that part",
    (hash) => {
      expect(parseRoute(hash)).toEqual({ page: "narrow", path: { fixed: [{ param: "width", value: 16 }] } });
    },
  );
});

describe("narrowHash", () => {
  it("Given fixed values and an open branch, When making the fragment, Then the values are listed in order and the branch is appended last", () => {
    const path = {
      fixed: [
        { param: "width", value: 16 },
        { param: "refin", value: true },
      ],
      open: "xorout",
    } as const;

    expect(narrowHash(path)).toBe("#narrow/width=16/refin=true/xorout");
  });

  it("Given an empty path, When making the fragment, Then #narrow", () => {
    expect(narrowHash({ fixed: [] })).toBe("#narrow");
  });
});

describe("cyclic page fragment", () => {
  it("Given fragment #cyclic, When determining the page, Then the cyclic page for the default generator polynomial", () => {
    expect(parseRoute("#cyclic")).toEqual({ page: "cyclic", generator: { width: 3, poly: 0x3 } });
  });

  it("Given fragment #cyclic/width=4/poly=0xF, When determining the page, Then that generator polynomial", () => {
    expect(parseRoute("#cyclic/width=4/poly=0xF")).toEqual({ page: "cyclic", generator: { width: 4, poly: 0xf } });
  });

  it.each(["#cyclic/width=4/poly=0x5", "#cyclic/width=x/poly=0x3", "#cyclic/poly=0x3"])(
    "Given fragment %j that is not in the list or cannot be parsed, When determining the page, Then the default generator polynomial",
    (hash) => {
      expect(parseRoute(hash)).toEqual({ page: "cyclic", generator: { width: 3, poly: 0x3 } });
    },
  );

  it("Given a generator polynomial, When making the fragment, Then width is written in decimal and poly in uppercase hexadecimal, and it can be read back", () => {
    expect(generatorHash("cyclic", { width: 4, poly: 0xf })).toBe("#cyclic/width=4/poly=0xF");
    expect(parseRoute(generatorHash("cyclic", { width: 5, poly: 0x5 }))).toEqual({
      page: "cyclic",
      generator: { width: 5, poly: 0x5 },
    });
  });
});

describe("redundancy page fragment", () => {
  it("Given fragment #redundancy, When determining the page, Then the redundancy page for the default generator polynomial", () => {
    expect(parseRoute("#redundancy")).toEqual({ page: "redundancy", generator: { width: 3, poly: 0x3 } });
  });

  it("Given a generator polynomial, When making the redundancy page fragment, Then it can be read back", () => {
    expect(generatorHash("redundancy", { width: 4, poly: 0x3 })).toBe("#redundancy/width=4/poly=0x3");
    expect(parseRoute("#redundancy/width=4/poly=0x3")).toEqual({ page: "redundancy", generator: { width: 4, poly: 0x3 } });
  });
});

describe("substitution page fragment", () => {
  it.each(["#equivalence", "#equivalence/foo"])(
    "Given fragment %j, When determining the page, Then the substitution page",
    (hash) => {
      expect(parseRoute(hash)).toEqual({ page: "equivalence" });
    },
  );
});

describe("check page fragment", () => {
  it("Given fragment #check, When determining the page, Then the check page", () => {
    expect(parseRoute("#check")).toEqual({ page: "check" });
  });
});

describe("table page fragment", () => {
  it("Given the fragment #table, When the page is decided, Then the table page", () => {
    expect(parseRoute("#table")).toEqual({ page: "table" });
  });
});

describe("estimation page fragment", () => {
  it("Given the fragment #estimate, When the page is decided, Then the estimation page", () => {
    expect(parseRoute("#estimate")).toEqual({ page: "estimate" });
  });
});
