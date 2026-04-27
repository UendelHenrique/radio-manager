import PyPDF2
import re

pdf_path = "AXIA Energia_Manual.pdf"

with open(pdf_path, "rb") as f:
    reader = PyPDF2.PdfReader(f)
    full_text = ""
    for page in reader.pages:
        if page.extract_text():
            full_text += page.extract_text() + "\n"

hex_colors = set(re.findall(r'#[0-9a-fA-F]{6}', full_text))

with open("pdf_extract.txt", "w", encoding="utf-8") as out:
    out.write("CORES HEX ENCONTRADAS:\n")
    for hc in hex_colors:
        out.write(f"{hc}\n")
        
    out.write("\nCONTEXTO DE FONTES E CORES PRINCIPAIS:\n")
    lines = full_text.splitlines()
    for j, line in enumerate(lines):
        line_lower = line.lower()
        if "montserrat" in line_lower or "fonte" in line_lower or "tipografia" in line_lower or "primária" in line_lower:
            start = max(0, j-1)
            end = min(len(lines), j+2)
            out.write(f"--- L{j} ---\n")
            for k in range(start, end):
                out.write(lines[k].strip() + "\n")
