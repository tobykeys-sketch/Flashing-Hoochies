// Parse NOAA wind speed strings like "15 mph" or "10 to 15 mph" -> knots (number)
export function parseWindKnots(windSpeedStr) {
  if (!windSpeedStr) return null;
  // Take the higher number if a range is given ("10 to 15 mph")
  const matches = windSpeedStr.match(/(\d+)/g);
  if (!matches) return null;
  const mph = Math.max(...matches.map(Number));
  return Math.round(mph * 0.868976);
}
