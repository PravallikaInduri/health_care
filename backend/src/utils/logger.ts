type LogValue = unknown;

const serialize = (value: LogValue): string => {
  if (value instanceof Error) return value.stack || value.message;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

const write = (
  stream: NodeJS.WriteStream,
  level: "info" | "warn" | "error",
  values: LogValue[]
) => {
  stream.write(`[${new Date().toISOString()}] ${level.toUpperCase()} ${values.map(serialize).join(" ")}\n`);
};

export const logger = {
  info: (...values: LogValue[]) => write(process.stdout, "info", values),
  warn: (...values: LogValue[]) => write(process.stderr, "warn", values),
  error: (...values: LogValue[]) => write(process.stderr, "error", values),
};
