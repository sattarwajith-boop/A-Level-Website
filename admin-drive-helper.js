(function () {
  window.APH_DRIVE_SYNC = window.APH_DRIVE_SYNC || {
    // Optional code fallback. Paste your public Drive folder link and browser API key here
    // only if the admin settings fields are not available on your deployed page.
    folder: "",
    apiKey: ""
  };

  const SUBJECTS = [
    ["Combined Maths", /\b(combined\s*maths?|combined\s*mathematics|pure|applied)\b/i, "Physical Science"],
    ["Physics", /\bphysics\b/i, "Physical Science"],
    ["Chemistry", /\bchemistry\b/i, "Physical Science"],
    ["Biology", /\bbiology\b/i, "Bio Science"],
    ["ICT", /\b(ict|information\s+technology)\b/i, "Technology"],
    ["General English", /\bgeneral\s+english\b/i, "Common Resources"],
    ["General Knowledge", /\b(general\s+knowledge|gk)\b/i, "Common Resources"],
    ["Accounting", /\baccount(ing)?\b/i, "Commerce"],
    ["Business Studies", /\b(business\s+studies|bs)\b/i, "Commerce"],
    ["Economics", /\beconomics?\b/i, "Commerce"],
    ["Engineering Technology", /\b(engineering\s+technology|et)\b/i, "Technology"],
    ["Science for Technology", /\b(science\s+for\s+technology|sft)\b/i, "Technology"],
    ["Bio Systems Technology", /\b(bio\s*systems?\s*technology|bst)\b/i, "Technology"],
    ["Sinhala", /\bsinhala\b/i, "Arts"],
    ["Tamil", /\btamil\b/i, "Arts"],
    ["Political Science", /\bpolitical\s+science\b/i, "Arts"],
    ["Geography", /\bgeography\b/i, "Arts"],
    ["History", /\bhistory\b/i, "Arts"],
    ["Logic", /\blogic\b/i, "Arts"],
    ["Islam", /\bislam\b/i, "Arts"],
    ["Buddhism", /\bbuddhism\b/i, "Arts"],
    ["Christianity", /\bchristianity\b/i, "Arts"]
  ];

  function cleanName(input) {
    return String(input || "")
      .replace(/^https?:\/\/\S+$/i, "")
      .replace(/\.[a-z0-9]{2,5}$/i, "")
      .replace(/[_|]+/g, " ")
      .replace(/\s*-\s*/g, " - ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function titleCase(text) {
    return String(text || "")
      .toLowerCase()
      .replace(/\b[a-z]/g, (char) => char.toUpperCase())
      .replace(/\bFwc\b/g, "FWC")
      .replace(/\bIct\b/g, "ICT");
  }

  function driveFileId(input) {
    const text = String(input || "");
    const fileMatch = text.match(/drive\.google\.com\/file\/d\/([^/?#]+)/i);
    if (fileMatch) return fileMatch[1];
    try {
      const url = new URL(text);
      if (/drive\.google\.com$/i.test(url.hostname)) return url.searchParams.get("id") || "";
    } catch (_) {}
    return "";
  }

  function driveFolderId(input) {
    const text = String(input || "");
    const folderMatch = text.match(/drive\.google\.com\/drive\/folders\/([^/?#]+)/i);
    if (folderMatch) return folderMatch[1];
    try {
      const url = new URL(text);
      if (/drive\.google\.com$/i.test(url.hostname)) return url.searchParams.get("id") || "";
    } catch (_) {}
    return "";
  }

  function normalizeDriveDownloadUrl(input) {
    const id = driveFileId(input);
    return id ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}` : String(input || "").trim();
  }

  function inferMedium(text) {
    if (/\btamil\s*(medium)?\b/i.test(text)) return "Tamil";
    if (/\bsinhala\s*(medium)?\b/i.test(text)) return "Sinhala";
    if (/\benglish\s*(medium)?\b/i.test(text)) return "English";
    if (/\bbilingual\b/i.test(text)) return "Bilingual";
    return "";
  }

  function inferType(text) {
    if (/\b(fwc|field\s*work\s*centre)\b/i.test(text)) return "FWC Paper";
    if (/\b(mora|moratuwa)\b/i.test(text)) return "Mora Paper";
    if (/\b(elaboration|explanation|explained|discussion)\b/i.test(text)) return "Elaboration";
    if (/\b(marking|answer|scheme|answers?)\b/i.test(text)) return "Marking Scheme";
    if (/\bsyllabus\b/i.test(text)) return "Syllabus";
    if (/\b(short\s*notes?|notes?|unit|lesson)\b/i.test(text)) return "Short Note";
    if (/\b(book|text\s*book|guide)\b/i.test(text)) return "Book";
    if (/\b(model)\b/i.test(text)) return "Model Paper";
    if (/\b(term\s*test|term)\b/i.test(text)) return "Term Test Paper";
    if (/\b(school)\b/i.test(text)) return "School Paper";
    if (/\b(province|provincial)\b/i.test(text)) return "Province Paper";
    if (/\b(revision)\b/i.test(text)) return "Revision Paper";
    if (/\b(question\s*bank)\b/i.test(text)) return "Question Bank";
    if (/\b(pa(?:s|st|ss)\s*)?papers?\b/i.test(text) || /\b20\d{2}\b/.test(text)) return "Past Paper";
    return "";
  }

  function inferSubject(text) {
    const found = SUBJECTS.find(([, pattern]) => pattern.test(text));
    return found ? { subject: found[0], stream: found[2] } : { subject: "", stream: "" };
  }

  function inferPaperPart(text) {
    if (/\b(part|paper)\s*(i|1)\b/i.test(text)) return "Part I";
    if (/\b(part|paper)\s*(ii|2)\b/i.test(text)) return "Part II";
    if (/\bmcq\b/i.test(text)) return "MCQ";
    if (/\bessay\b/i.test(text)) return "Essay";
    if (/\bpractical\b/i.test(text)) return "Practical";
    if (/\b(elaboration|explanation|explained|discussion)\b/i.test(text)) return "Elaboration";
    if (/\b(marking|scheme)\b/i.test(text)) return "Marking Scheme";
    return "";
  }

  function folderPathLabel(context) {
    return Array.isArray(context?.pathSegments) ? context.pathSegments.filter(Boolean).join(" / ") : "";
  }

  function rootCategory(text) {
    if (/\b(fwc|field\s*work\s*centre)\b/i.test(text)) return "FWC Papers";
    if (/\b(mora|moratuwa)\b/i.test(text)) return "Mora Papers";
    if (/\bsyllabus(es)?\b/i.test(text)) return "Syllabus";
    if (/\b(pa(?:s|st|ss)\s*)?papers?\b/i.test(text)) return "Past Papers";
    return "";
  }

  function inferMetadata(input, context) {
    const raw = String(input || "").trim();
    const fileId = driveFileId(raw);
    const originalFilename = context?.filename || raw;
    const filename = cleanName(originalFilename) || cleanName(context?.folderName || "");
    const pathLabel = folderPathLabel(context);
    const text = [filename, context?.folderName || "", context?.parentHints || "", pathLabel].join(" ");
    const yearMatch = text.match(/\b(20[0-3]\d|19[8-9]\d)\b/);
    const subject = inferSubject(text);
    const type = inferType(text);
    const medium = inferMedium(text);
    const paperPart = inferPaperPart(text);
    const category = rootCategory(text);
    const titleParts = [];
    if (yearMatch) titleParts.push(yearMatch[1]);
    if (subject.subject) titleParts.push(subject.subject);
    titleParts.push(filename
      .replace(/\b(20[0-3]\d|19[8-9]\d)\b/g, "")
      .replace(/\b(tamil|sinhala|english|bilingual)\s*(medium)?\b/ig, "")
      .replace(/\b(marking|answer|scheme|answers?|past|pass|paper|papers|pdf|fwc|mora|moratuwa|syllabus|elaboration|explanation|explained)\b/ig, "")
      .replace(/\s+/g, " ")
      .trim());
    if (type && !new RegExp(type.replace(/\s+/g, "\\s+"), "i").test(filename)) titleParts.push(type);

    return {
      title: titleCase(titleParts.filter(Boolean).join(" - ")) || titleCase(filename),
      year: yearMatch ? yearMatch[1] : "",
      subject: subject.subject,
      stream: subject.stream,
      type,
      medium,
      paperPart,
      examType: yearMatch ? "GCE A/L" : "",
      category,
      folderPath: pathLabel,
      tags: [category, subject.subject, yearMatch?.[1], medium, type, paperPart].filter(Boolean),
      fileName: context?.filename || raw,
      externalUrl: fileId ? normalizeDriveDownloadUrl(raw) : ""
    };
  }

  function parseLines(text) {
    return String(text || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const urlMatch = line.match(/https?:\/\/\S+/i);
        const url = urlMatch ? urlMatch[0].replace(/[),\]]+$/, "") : "";
        const name = cleanName(line.replace(url, "")) || cleanName(url);
        return inferMetadata(url || name, { filename: name });
      });
  }

  function extractDriveFilesFromHtml(html) {
    const files = [];
    const seen = new Set();
    const re = /\["([A-Za-z0-9_-]{20,})","([^"]+?\.(?:pdf|docx?|zip|png|jpe?g|webp))"/gi;
    let match;
    while ((match = re.exec(html))) {
      const id = match[1];
      const name = match[2].replace(/\\u0026/g, "&");
      if (seen.has(id)) continue;
      seen.add(id);
      files.push(inferMetadata(`https://drive.google.com/file/d/${id}/view`, { filename: name }));
    }
    return files;
  }

  async function listDriveApiFolder(folderId, apiKey, parentHints, seen, pathSegments) {
    const files = [];
    const currentPath = Array.isArray(pathSegments) ? pathSegments : [];
    let pageToken = "";
    do {
      const params = new URLSearchParams({
        key: apiKey,
        q: `'${folderId}' in parents and trashed = false`,
        fields: "nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,webContentLink)",
        pageSize: "1000",
        supportsAllDrives: "true",
        includeItemsFromAllDrives: "true"
      });
      if (pageToken) params.set("pageToken", pageToken);
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`);
      if (!res.ok) throw new Error(`Google Drive API returned ${res.status}`);
      const data = await res.json();
      for (const file of data.files || []) {
        if (seen.has(file.id)) continue;
        seen.add(file.id);
        const nextHints = [parentHints, file.name].filter(Boolean).join(" ");
        if (file.mimeType === "application/vnd.google-apps.folder") {
          files.push(...await listDriveApiFolder(file.id, apiKey, nextHints, seen, [...currentPath, file.name]));
          continue;
        }
        if (!/\.(pdf|docx?|zip|png|jpe?g|webp)$/i.test(file.name)) continue;
        files.push({
          ...inferMetadata(`https://drive.google.com/file/d/${file.id}/view`, {
            filename: file.name,
            parentHints,
            pathSegments: currentPath
          }),
          driveId: file.id,
          modifiedTime: file.modifiedTime || "",
          externalUrl: normalizeDriveDownloadUrl(`https://drive.google.com/file/d/${file.id}/view`)
        });
      }
      pageToken = data.nextPageToken || "";
    } while (pageToken);
    return files;
  }

  async function analyzeFolder(input, options) {
    const folderId = driveFolderId(input);
    const pastedRows = parseLines(input).filter((row) => row.title);
    if (!folderId) return { files: pastedRows, warning: pastedRows.length ? "" : "Paste a public Google Drive folder link or a list of PDF filenames." };

    if (options?.apiKey) {
      try {
        const rootName = cleanName(options?.rootName || "");
        const files = await listDriveApiFolder(folderId, options.apiKey, rootName, new Set(), rootName ? [rootName] : []);
        return {
          files,
          warning: files.length ? "" : "The Drive API found no supported files in that folder."
        };
      } catch (err) {
        return {
          files: pastedRows,
          warning: `Drive API scan failed: ${err.message}. Check that the API key is valid, Drive API is enabled, and the folder is shared with anyone who has the link.`
        };
      }
    }

    try {
      const res = await fetch(`https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}`, { credentials: "omit" });
      const html = await res.text();
      const files = extractDriveFilesFromHtml(html);
      return {
        files: files.length ? files : pastedRows,
        warning: files.length ? "" : "The folder page did not expose file names in this browser. Paste the PDF filenames into the box and analyze again."
      };
    } catch (_) {
      return {
        files: pastedRows,
        warning: "Browser security blocked reading this Drive folder. Paste the PDF filenames into the box and analyze again."
      };
    }
  }

  window.APHDriveHelper = {
    inferMetadata,
    parseLines,
    analyzeFolder,
    driveFolderId,
    normalizeDriveDownloadUrl
  };
})();
