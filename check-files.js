import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    const list = fs.readdirSync(dir);
    for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            getFiles(fullPath, files);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            const lineCount = fs.readFileSync(fullPath, 'utf-8').split('\n').length;
            files.push({ file: fullPath.replace(__dirname, ''), lines: lineCount });
        }
    }
    return files;
}

const pages = getFiles(path.join(__dirname, 'src', 'pages', 'dashboard'));
console.log("=== ARQUIVOS DE PÁGINA INFLADOS (> 400 linhas) ===");
const bloatedPages = pages.filter(p => p.lines > 400).sort((a, b) => b.lines - a.lines);
bloatedPages.forEach(p => console.log(`${p.file}: ${p.lines} linhas`));

const generalComponents = getFiles(path.join(__dirname, 'src', 'components'));
console.log("\n=== COMPONENTES GENÉRICOS INFLADOS (> 300 linhas) ===");
const bloatedComps = generalComponents.filter(p => p.lines > 300).sort((a, b) => b.lines - a.lines);
bloatedComps.forEach(p => console.log(`${p.file}: ${p.lines} linhas`));

console.log("\n=== PASTAS DE FEATURES EXISTENTES ===");
const featuresDir = path.join(__dirname, 'src', 'features');
if (fs.existsSync(featuresDir)) {
    console.log(fs.readdirSync(featuresDir).filter(f => fs.statSync(path.join(featuresDir, f)).isDirectory()).join(', '));
} else {
    console.log("Nenhuma pasta de features encontrada.");
}
