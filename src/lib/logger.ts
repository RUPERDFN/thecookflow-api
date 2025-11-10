type LogLevel = "info" | "warn" | "error";

type LogPayload = Record<string, unknown>;

const emit = (level: LogLevel, payload: LogPayload, message: string) => {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...payload
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
};

const withDefaults = (payload?: LogPayload, message?: string): [LogPayload, string] => {
  return [payload ?? {}, message ?? "log"];
};

export const logger = {
  info: (payload?: LogPayload, message?: string) => {
    const [data, text] = withDefaults(payload, message);
    emit("info", data, text);
  },
  warn: (payload?: LogPayload, message?: string) => {
    const [data, text] = withDefaults(payload, message);
    emit("warn", data, text);
  },
  error: (payload?: LogPayload, message?: string) => {
    const [data, text] = withDefaults(payload, message);
    emit("error", data, text);
  }
};
