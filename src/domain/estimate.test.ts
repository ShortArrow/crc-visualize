import { describe, expect, it } from "vitest";
import { crcOf } from "./equivalence";
import { bruteForce, catalogueByWidth, catalogueMatches, crcBytes, parseCrc, parseData, type Sample } from "./estimate";
import { CATALOGUE } from "./presets";
import { bitsFromBytes, type CrcParams } from "./trace";

const params = (name: string): CrcParams => CATALOGUE.find((p) => p.name === name)!.params;
const bytesOf = (s: string) => [...new TextEncoder().encode(s)];
const sample = (p: CrcParams, s: string): Sample => ({ data: bytesOf(s), crc: crcBytes(p, bytesOf(s)) });

describe("estimate", () => {
  it.each(CATALOGUE)("Given $name, When 123456789 is computed over bytes, Then it equals the bit-at-a-time CRC", (preset) => {
    const data = bytesOf("123456789");
    expect(crcBytes(preset.params, data)).toBe(crcOf(preset.params, bitsFromBytes(data)));
  });

  it("Given text and hex, When data is parsed, Then it becomes the bytes, and unreadable hex is rejected", () => {
    expect(parseData("text", "12")).toEqual([0x31, 0x32]);
    expect(parseData("hex", "31 32")).toEqual([0x31, 0x32]);
    expect(parseData("hex", "313")).toBeUndefined();
    expect(parseData("hex", "zz")).toBeUndefined();
  });

  it("Given a CRC text, When parsed for width 16, Then hex with or without 0x is read, and values not fitting 16 bits are rejected", () => {
    expect(parseCrc("0x4B37", 16)).toBe(0x4b37);
    expect(parseCrc("4b37", 16)).toBe(0x4b37);
    expect(parseCrc("1FFFF", 16)).toBeUndefined();
    expect(parseCrc("", 16)).toBeUndefined();
  });

  it("Given pairs made with CRC-16/MODBUS, When the catalogue is searched, Then CRC-16/MODBUS is found", () => {
    const p = params("CRC-16/MODBUS");
    const found = catalogueMatches([sample(p, "hello"), sample(p, "world!")], 16);
    expect(found.map((f) => f.name)).toEqual(["CRC-16/MODBUS"]);
  });

  it("Given two same-length pairs and one of another length made with CRC-16/MODBUS, When brute-forced, Then its parameters are found with init determined", () => {
    const p = params("CRC-16/MODBUS");
    const result = bruteForce([sample(p, "hello"), sample(p, "world"), sample(p, "123456789")], 16);
    expect(result.status).toBe("ok");
    expect(result.candidates).toContainEqual({ params: p, initKnown: true });
  });

  it("Given only same-length pairs made with CRC-16/MODBUS, When brute-forced, Then poly and reflection are found but init is not determined", () => {
    const p = params("CRC-16/MODBUS");
    const result = bruteForce([sample(p, "hello"), sample(p, "world")], 16);
    const found = result.candidates.find((c) => c.params.poly === p.poly && c.params.refin && c.params.refout);
    expect(found?.initKnown).toBe(false);
    expect(found?.params.init).toBe(0);
    expect(crcBytes(found!.params, bytesOf("hello"))).toBe(crcBytes(p, bytesOf("hello")));
  });

  it("Given an 8-bit CRC from CRC-8/SMBUS with pairs of two lengths, When brute-forced, Then CRC-8/SMBUS is among the candidates", () => {
    const p = params("CRC-8/SMBUS");
    const result = bruteForce([sample(p, "ab"), sample(p, "cd"), sample(p, "xyz")], 8);
    expect(result.candidates).toContainEqual({ params: p, initKnown: true });
  });

  it("Given pairs that all differ in length, When brute-forced, Then it needs a same-length pair", () => {
    const p = params("CRC-16/MODBUS");
    expect(bruteForce([sample(p, "a"), sample(p, "bc")], 16).status).toBe("needPair");
  });

  it("Given width 32, When brute-forced, Then it is too wide, while the catalogue still finds CRC-32/ISO-HDLC", () => {
    const p = params("CRC-32/ISO-HDLC");
    const samples = [sample(p, "hello"), sample(p, "world")];
    expect(bruteForce(samples, 32).status).toBe("tooWide");
    expect(catalogueMatches(samples, 32).map((f) => f.name)).toContain("CRC-32/ISO-HDLC");
  });

  it("Given the catalogue, When it is ordered for width 16, Then the 16-bit presets come first and the rest keep the catalogue order", () => {
    const ordered = catalogueByWidth(16);
    const sixteen = CATALOGUE.filter((p) => p.params.width === 16);
    expect(ordered.slice(0, sixteen.length)).toEqual(sixteen);
    expect(ordered.slice(sixteen.length)).toEqual(CATALOGUE.filter((p) => p.params.width !== 16));
  });
});
