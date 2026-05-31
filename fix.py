import re

with open('d:/GRYF AI/WORKFLOW/pb_hooks/main.pb.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Manual replacements for mojibake
replacements = {
    'Ä…': 'ą', 'Ä‡': 'ć', 'Ä™': 'ę', 'Ĺ‚': 'ł', 'Ĺ„': 'ń', 'Ăł': 'ó', 'Ĺ›': 'ś', 'Ĺş': 'ź', 'ĹĽ': 'ż',
    'Ä„': 'Ą', 'Ä†': 'Ć', 'Ä': 'Ę', 'Ĺ': 'Ł', 'Ĺƒ': 'Ń', 'Ă“': 'Ó', 'Ĺš': 'Ś', 'Ĺą': 'Ź', 'Ĺ»': 'Ż'
}

fixed_content = content
for k, v in replacements.items():
    fixed_content = fixed_content.replace(k, v)

if fixed_content != content:
    print('Fixed mojibake.')
    with open('d:/GRYF AI/WORKFLOW/pb_hooks/main.pb.js', 'w', encoding='utf-8') as f:
        f.write(fixed_content)
else:
    print('No mojibake found with manual replacements.')

# Now let's try the cp1252 trick if there's still broken stuff, but manual is safer.
# Let's check for hooks missing e.next()
hooks = re.finditer(r'(onRecord[a-zA-Z]+Request\s*\([^)]+\)\s*\{)', fixed_content)
for match in hooks:
    idx = match.end()
    # Check if e.next() is in the next 150 chars
    chunk = fixed_content[idx:idx+150]
    if 'e.next()' not in chunk and 'return e.next()' not in chunk and 'return e.json' not in chunk:
        line_num = fixed_content[:idx].count('\n') + 1
        print(f'Possible missing e.next() around line {line_num}: {match.group(1)}')
