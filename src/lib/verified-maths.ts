// A small arithmetic parser for model-proposed numeric claims. Never evaluates JavaScript.
export function calculate(expression: string): number | null {
  const compact = expression
    .replace(/\s/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-");
  const tokens = compact.match(/\d+(?:\.\d+)?|[()+*/-]/g);
  if (!tokens || tokens.join("") !== compact || tokens.length > 40) return null;
  let i = 0;
  function primary(): number {
    const t = tokens![i++];
    if (t === "(") {
      const value = add();
      if (tokens![i++] !== ")") throw new Error();
      return value;
    }
    if (t === "-") return -primary();
    if (!t || !/^\d/.test(t)) throw new Error();
    return Number(t);
  }
  function multiply(): number {
    let value = primary();
    while (["*", "/"].includes(tokens![i])) {
      const op = tokens![i++],
        right = primary();
      if (op === "/" && right === 0) throw new Error();
      value = op === "*" ? value * right : value / right;
    }
    return value;
  }
  function add(): number {
    let value = multiply();
    while (["+", "-"].includes(tokens![i])) {
      const op = tokens![i++],
        right = multiply();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }
  try {
    const value = add();
    return i === tokens.length &&
      Number.isFinite(value) &&
      Math.abs(value) <= 1e9
      ? value
      : null;
  } catch {
    return null;
  }
}
export function verifiedClaims(
  reply: string,
  claims: { expression: string; value: number }[],
): boolean {
  for (const claim of claims) {
    const value = calculate(claim.expression);
    if (value === null || Math.abs(value - claim.value) > 1e-7) return false;
  }
  // Explicit equations appearing in the caption must also be true, not just the declared claims.
  const equations = reply.matchAll(
    /([-+]?\d+(?:\.\d+)?(?:\s*[+−×÷*/-]\s*[-+]?\d+(?:\.\d+)?)+)\s*=\s*([-+]?\d+(?:\.\d+)?)/g,
  );
  for (const match of equations) {
    const value = calculate(match[1]);
    if (value === null || Math.abs(value - Number(match[2])) > 1e-7)
      return false;
  }
  return (reply.match(/\?/g) || []).length <= 1;
}
