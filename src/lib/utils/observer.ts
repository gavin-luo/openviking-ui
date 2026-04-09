/**
 * Parses a table-like string from observer status into an array of objects.
 * The table uses 2 or more spaces or tabs as column separators.
 */
export function parseObserverTable(statusStr: string | undefined | null): Record<string, string>[] {
  if (!statusStr) return [];
  const lines = statusStr.trim().split('\n').map(l => l.trimEnd());
  if (lines.length < 2) return [];

  const data: Record<string, string>[] = [];
  
  // Check if it's an ASCII table with '|' and '+---+'
  const isAsciiTable = lines.some(line => line.trim().startsWith('+---') || line.trim().startsWith('|'));

  if (isAsciiTable) {
    let currentHeaders: string[] = [];
    let isParsingHeaders = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        currentHeaders = [];
        continue;
      }

      if (line.startsWith('+---')) {
        if (!currentHeaders.length) {
          const nextLine = lines[i + 1]?.trim();
          if (nextLine && nextLine.startsWith('|')) {
            isParsingHeaders = true;
          }
        }
        continue;
      }

      if (line.startsWith('|')) {
        const rowContent = line.substring(1, line.length - (line.endsWith('|') ? 1 : 0));
        const columns = rowContent.split('|').map(c => c.trim());

        if (isParsingHeaders) {
          currentHeaders = columns;
          isParsingHeaders = false;
        } else if (currentHeaders.length > 0 && columns.length === currentHeaders.length) {
          const rowObj: Record<string, string> = {};
          for (let j = 0; j < currentHeaders.length; j++) {
            rowObj[currentHeaders[j]] = columns[j];
          }
          data.push(rowObj);
        }
      } else {
        currentHeaders = [];
      }
    }
    return data;
  }

  const headerLine = lines[0];
  // 避免将 Markdown 误认为 Observer 表格
  if (/^[#*>\-`]/.test(headerLine.trim())) return [];

  const headerNames = headerLine.split(/\s{2,}|\t+/).map(h => h.trim()).filter(Boolean);
  
  // 必须有两列以上才认为是表格，否则作为普通多行文本处理
  if (headerNames.length < 2) return [];

  const headers: { name: string; start: number }[] = [];
  let currentIndex = 0;
  for (const h of headerNames) {
    const start = headerLine.indexOf(h, currentIndex);
    headers.push({ name: h, start });
    currentIndex = start + h.length;
  }

  const oldData: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      const start = headers[j].start;
      const end = j < headers.length - 1 ? headers[j+1].start : line.length;
      row[headers[j].name] = line.substring(start, end).trim();
    }
    
    // 如果整行解析出来全是空，则跳过
    if (Object.values(row).every(v => !v)) continue;
    
    oldData.push(row);
  }
  return oldData;
}
