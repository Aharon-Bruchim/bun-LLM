// Weather Tool - כלי מזג אוויר (מדומה)

export const weatherTool = {
  name: "weather",
  description: "Get weather information for a city",
  parameters: {
    type: "object",
    properties: {
      city: {
        type: "string",
        description: "City name (e.g., Tel Aviv, Jerusalem, Haifa)"
      }
    },
    required: ["city"]
  }
};

// מידע מדומה - בפרויקט אמיתי זה יתחבר ל-API
const weatherData = {
  "תל אביב": { temp: 22, condition: "בהיר", humidity: 65 },
  "tel aviv": { temp: 22, condition: "בהיר", humidity: 65 },
  "ירושלים": { temp: 18, condition: "מעונן חלקית", humidity: 55 },
  "jerusalem": { temp: 18, condition: "מעונן חלקית", humidity: 55 },
  "חיפה": { temp: 21, condition: "בהיר", humidity: 70 },
  "haifa": { temp: 21, condition: "בהיר", humidity: 70 },
  "אילת": { temp: 28, condition: "שמשי וחם", humidity: 30 },
  "eilat": { temp: 28, condition: "שמשי וחם", humidity: 30 },
  "באר שבע": { temp: 24, condition: "בהיר", humidity: 40 },
  "beer sheva": { temp: 24, condition: "בהיר", humidity: 40 }
};

export function executeWeather({ city }) {
  const cityLower = city.toLowerCase();
  const data = weatherData[city] || weatherData[cityLower];

  if (!data) {
    return {
      success: false,
      error: `לא נמצא מידע עבור העיר "${city}"`,
      availableCities: ["תל אביב", "ירושלים", "חיפה", "אילת", "באר שבע"]
    };
  }

  return {
    success: true,
    city: city,
    temperature: data.temp,
    temperatureUnit: "C",
    condition: data.condition,
    humidity: data.humidity,
    humidityUnit: "%"
  };
}
