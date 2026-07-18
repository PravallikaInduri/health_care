const write = (stream, level, values) => {
  const message = values
    .map((value) =>
      typeof value === "string" ? value : JSON.stringify(value, null, 2)
    )
    .join(" ");

  stream.write(`[${level}] ${message}\n`);
};

const logger = {
  info: (...values) => write(process.stdout, "info", values),
  warn: (...values) => write(process.stderr, "warn", values),
  error: (...values) => write(process.stderr, "error", values),
};

module.exports = logger;
