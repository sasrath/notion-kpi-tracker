// Test safeParseJSON with various truncation patterns
// Import the actual module to test the real function indirectly

function safeParseJSON(text) {
  try { return JSON.parse(text); } catch {}
  const stripped = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try { return JSON.parse(stripped); } catch {}
  const objMatch = stripped.match(/\{[\s\S]*/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch {}
    let c = objMatch[0];
    const quoteCount = (c.match(/(?<!\\)"/g) || []).length;
    if (quoteCount % 2 !== 0) {
      c = c.replace(/"[^"]*$/, "");
    }
    c = c.replace(/,\s*"[^"]*"\s*:\s*$/, "");
    c = c.replace(/,\s*\{[^}]*$/, "");
    c = c.replace(/,\s*"[^"]*"\s*:\s*[^,}\]]*$/, "");
    c = c.replace(/,\s*$/, "");
    const stack = [];
    let inString = false;
    for (let i = 0; i < c.length; i++) {
      const ch = c[i];
      if (inString) {
        if (ch === "\\" && i + 1 < c.length) { i++; continue; }
        if (ch === '"') inString = false;
      } else {
        if (ch === '"') inString = true;
        else if (ch === "{") stack.push("}");
        else if (ch === "[") stack.push("]");
        else if (ch === "}" || ch === "]") stack.pop();
      }
    }
    c += stack.reverse().join("");
    try { return JSON.parse(c); } catch (e) { console.error("  Repair failed:", c.slice(0, 300)); }
  }
  return null;
}

let pass = 0, fail = 0;
function test(name, input, validator) {
  const result = safeParseJSON(input);
  if (result && validator(result)) {
    console.log(`  ✓ ${name} → forecasts: ${result.forecasts?.length ?? "N/A"}`);
    pass++;
  } else {
    console.log(`  ✗ ${name} → got ${JSON.stringify(result)?.slice(0, 120)}`);
    fail++;
  }
}

console.log("\n── JSON Repair Tests ──\n");

// Case 1: User's exact error — truncated after "reasoning":
test("Truncated after key colon",
  '{ "forecasts": [ { "client": "Intel", "nextQuarter": "Q1", "nextYear": 2027, "forecastValue": 13700, "unit": "$M", "reasoning":',
  (r) => Array.isArray(r.forecasts)
);

// Case 2: Truncated mid-string value
test("Truncated mid-string",
  '{ "forecasts": [ { "client": "Intel", "nextQuarter": "Q1", "nextYear": 2027, "forecastValue": 13700, "unit": "$M", "reasoning": "Based on trend',
  (r) => Array.isArray(r.forecasts)
);

// Case 3: One complete + one truncated
test("One complete, one truncated",
  '{ "forecasts": [ { "client": "Apple", "nextQuarter": "Q4", "nextYear": 2025, "forecastValue": 98000, "unit": "$M", "reasoning": "Growth trend" }, { "client": "Intel", "nextQuarter": "Q1", "nextYear": 2027, "forecastValue": 13700, "unit": "$M", "reasoning":',
  (r) => r.forecasts?.length === 1 && r.forecasts[0].client === "Apple"
);

// Case 4: One complete + second truncated mid-string
test("One complete, second mid-string",
  '{ "forecasts": [ { "client": "Apple", "nextQuarter": "Q4", "nextYear": 2025, "forecastValue": 98000, "unit": "$M", "reasoning": "Growth" }, { "client": "Intel", "nextQuarter": "Q1", "nextYear": 2027, "forecastValue": 13700, "unit": "$M", "reasoning": "Based on',
  (r) => r.forecasts?.length === 1 && r.forecasts[0].client === "Apple"
);

// Case 5: Valid JSON (should pass through)
test("Valid JSON",
  '{ "forecasts": [ { "client": "Apple", "nextQuarter": "Q4", "nextYear": 2025, "forecastValue": 98000, "unit": "$M", "reasoning": "test" } ] }',
  (r) => r.forecasts?.length === 1
);

// Case 6: Wrapped in markdown
test("Markdown-wrapped",
  '```json\n{ "forecasts": [ { "client": "Apple", "nextQuarter": "Q4", "nextYear": 2025, "forecastValue": 98000, "unit": "$M", "reasoning": "test" } ] }\n```',
  (r) => r.forecasts?.length === 1
);

console.log(`\n── Results: ${pass} passed, ${fail} failed ──\n`);
process.exit(fail > 0 ? 1 : 0);
