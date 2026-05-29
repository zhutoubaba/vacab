import { type Word } from '../db';

export const csvService = {

  /**
   * Formats vocabulary words as a standard RFC-4180 CSV string and triggers a browser download.
   * Automatically adds a UTF-8 BOM to prevent character corruption when opened in Microsoft Excel.
   * 
   * @param {Word[]} words - The array of words to export.
   * @param {string} setName - The name of the word set, used to compile the dynamic filename.
   * @returns {void}
   */
  exportToCSV(words: Word[], setName: string): void {
    if (words.length === 0) return;

    const headers = ['Word', 'Phonetic', 'Definition_EN', 'Definition_JA', 'Sentence_1', 'Sentence_2', 'Sentence_3'];
    const csvRows = [headers.join(',')];

    const escapeCsv = (str: string) => {
      return `"${(str || '').replace(/"/g, '""')}"`;
    };

    for (const w of words) {
      const row = [
        escapeCsv(w.word),
        escapeCsv(w.phonetic || ''),
        escapeCsv(w.definition_en || ''),
        escapeCsv(w.definition_ja || ''),
        escapeCsv(w.sentences?.[0] || ''),
        escapeCsv(w.sentences?.[1] || ''),
        escapeCsv(w.sentences?.[2] || '')
      ];
      csvRows.push(row.join(','));
    }

    const csvContent = csvRows.join('\r\n');
    // Add UTF-8 BOM for Microsoft Excel compatibility
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    // Sanitize filename
    const sanitizedSetName = setName.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '_');
    link.setAttribute("download", `${sanitizedSetName}_vocab.csv`);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
