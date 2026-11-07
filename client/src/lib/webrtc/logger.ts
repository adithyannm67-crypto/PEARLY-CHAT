export function log(
  prefix: string,
  convId: string | null,
  message: string,
  data?: unknown,
) {
  const conv = convId ?? "-";
  if (data !== undefined) {
    console.log(
      `[${prefix}] conv=${conv} ${new Date().toISOString()} ${message}`,
      data,
    );
  } else {
    console.log(
      `[${prefix}] conv=${conv} ${new Date().toISOString()} ${message}`,
    );
  }
}
