const informational = new Set([
  "Answer counts are not stored; topic_performance is unavailable.",
  "A student may appear in multiple score ranges when they have multiple assessments.",
]);

export function dashboardWarnings(warnings: string[]): string[] {
  return warnings.flatMap((warning) => {
    if (informational.has(warning)) return [];
    if (warning === "Some assessments have no subject; subject filtering excludes those rows."
        || warning === "Subject is not stored in the current CSV schema; subject filtering is unavailable.")
      return ["У части оценочных записей не указан предмет; фильтр по предмету исключит эти строки."];
    const undated = /^Excluded (\d+) undated records from performance_trend\.$/.exec(warning);
    if (undated) return [`Из графика динамики исключено записей без даты: ${undated[1]}.`];
    const invalid = /^Excluded (\d+) invalid assessment records\.$/.exec(warning);
    if (invalid) return [`Исключено некорректных оценочных записей: ${invalid[1]}.`];
    return [warning];
  });
}
