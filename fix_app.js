const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');

// We know line 477 (index 476) is the problematic line
// But let's be safer and search for the context
let targetIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('Tentez un rafraîchissement') && lines[i+5] && lines[i+6].includes(')}')) {
        targetIndex = i + 6;
        break;
    }
}

if (targetIndex !== -1) {
    console.log('Fixing line', targetIndex + 1);
    lines.splice(targetIndex, 1);
} else {
    // Fallback search
    for (let i = 400; i < 500; i++) {
        if (lines[i] && lines[i].trim() === ')}' && lines[i+1] && lines[i+1].trim() === ')}' && lines[i+2] && lines[i+2].trim() === '</div>') {
             console.log('Found block at', i+1);
             lines.splice(i+1, 1);
             break;
        }
    }
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log('Done');
