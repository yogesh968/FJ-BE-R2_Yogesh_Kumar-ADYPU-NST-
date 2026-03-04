import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getActualCase(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const dir = path.dirname(filePath);
    const base = path.basename(filePath);
    const files = fs.readdirSync(dir);
    if (!files.includes(base)) return 'wrong-case';
    return 'ok';
}

function checkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            checkDir(fullPath);
        } else if (fullPath.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const imports = content.match(/import\s+.*?\s+from\s+['"](.*?)['"]/g);
            if (imports) {
                for (const imp of imports) {
                    const match = imp.match(/from\s+['"](.*?)['"]/);
                    if (match) {
                        const importPath = match[1];
                        if (importPath.startsWith('.')) {
                            const targetPath = path.resolve(path.dirname(fullPath), importPath);
                            const actual = getActualCase(targetPath);
                            if (actual === null) {
                                console.log('Missing file:', importPath, 'in', fullPath);
                            } else if (actual === 'wrong-case') {
                                console.log('Case mismatch:', importPath, 'in', fullPath, '=>', targetPath);
                            }
                        }
                    }
                }
            }
        }
    }
}
checkDir('./src');
