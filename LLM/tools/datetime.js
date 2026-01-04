// DateTime Tool - כלי תאריך ושעה

export const datetimeTool = {
  name: "datetime",
  description: "Get current date and time",
  parameters: {
    type: "object",
    properties: {
      format: {
        type: "string",
        enum: ["full", "date", "time"],
        description: "Output format: full, date only, or time only"
      },
      timezone: {
        type: "string",
        description: "Timezone (e.g., Israel, UTC, America/New_York)"
      }
    },
    required: []
  }
};

export function executeDatetime({ format = "full", timezone = "Israel" }) {
  const now = new Date();

  const options = {
    timeZone: timezone === "Israel" ? "Asia/Jerusalem" : timezone
  };

  let result = {};

  try {
    if (format === "date" || format === "full") {
      result.date = now.toLocaleDateString("he-IL", {
        ...options,
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric"
      });
    }

    if (format === "time" || format === "full") {
      result.time = now.toLocaleTimeString("he-IL", {
        ...options,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
    }

    result.timezone = timezone;
    result.success = true;

  } catch (error) {
    return { error: "אזור זמן לא תקין", success: false };
  }

  return result;
}
