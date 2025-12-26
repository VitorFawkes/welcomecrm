
const dbTimestamp = "2026-03-15 00:00:00+00";

console.log("--- Testing split('T') ---");
const splitT = dbTimestamp.split('T')[0];
console.log(`Original: "${dbTimestamp}"`);
console.log(`Split('T'): "${splitT}"`);
console.log(`Valid for input date? ${/^\d{4}-\d{2}-\d{2}$/.test(splitT)}`);

console.log("\n--- Testing robust parsing ---");
function toInputDate(value: string) {
    if (!value) return '';
    // Handle "YYYY-MM-DD HH:mm:ss+00" or "YYYY-MM-DDTHH:mm:ss.sssZ"
    // Simply take the first 10 chars if they look like a date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.substring(0, 10);
    }
    return '';
}

const fixed = toInputDate(dbTimestamp);
console.log(`Fixed: "${fixed}"`);
console.log(`Valid for input date? ${/^\d{4}-\d{2}-\d{2}$/.test(fixed)}`);

console.log("\n--- Testing CardHeader Logic ---");
// Current logic in CardHeader
let date: Date | null = null;
if (dbTimestamp.includes('T') || dbTimestamp.includes(':') || dbTimestamp.includes('+')) {
    date = new Date(dbTimestamp);
} else {
    date = new Date(dbTimestamp + 'T12:00:00');
}
console.log(`Parsed Date: ${date.toString()}`);
console.log(`Is NaN? ${isNaN(date.getTime())}`);
