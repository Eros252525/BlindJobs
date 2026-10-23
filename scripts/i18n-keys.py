"""Lists every English string the app passes to t(), plus the lists shown through t(x).
Usage: python keys.py <src dir> [fil.ts]  → prints keys missing from fil.ts (or all keys)."""
import re, sys, os, json

src = sys.argv[1]
STR = r"""'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)\""""
keys = set()

def unq(m):
    a, b = m
    s = a if a or not b else b
    return s.replace("\\'", "'").replace('\\"', '"')

for root, _, files in os.walk(src):
    for f in files:
        if not f.endswith(('.ts', '.tsx')) or f == 'fil.ts': continue
        text = open(os.path.join(root, f), encoding='utf-8').read()
        # t('x'), t("x"), t(cond ? 'a' : 'b')
        for m in re.finditer(r"\bt\(\s*(?:[^'\"()]*?\?\s*)?(" + STR + r")(?:\s*:\s*(" + STR + r"))?", text):
            for grp in (m.group(1), m.group(4)):
                if grp:
                    mm = re.match(STR, grp)
                    keys.add(unq(mm.groups()))

# Lists whose items are shown through t(item)
LISTS = {
 'lib/resume.ts': ['ASSISTIVE_TECH', 'WORK_SETUPS', 'DISABILITY_TYPES', 'ACCOMMODATIONS', 'LANGUAGES', 'EDUCATION_LEVELS'],
}
for rel, names in LISTS.items():
    text = open(os.path.join(src, rel), encoding='utf-8').read()
    for name in names:
        m = re.search(name + r"\s*=\s*\[(.*?)\]", text, re.S)
        for s in re.findall(r"'([^']*)'", m.group(1)): keys.add(s)

# label: '...', spoken: '...', empty: '...' in data lists, and plain strings in these files
for rel in ['constants.ts', 'components/nav/nav-links.ts', 'screens/shared/messages/folders.ts', 'screens/auth/IntroScreen.tsx', 'screens/auth/register/steps.ts', 'screens/applicant/ProfileScreen.tsx']:
    text = open(os.path.join(src, rel), encoding='utf-8').read()
    for m in re.finditer(r"(?:label|spoken|empty|name):\s*'((?:[^'\\]|\\.)*)'", text): keys.add(m.group(1).replace("\\'", "'"))
    if rel.endswith('constants.ts'):
        block = re.search(r"SCREEN_LABELS[^{]*\{(.*?)\n\}", text, re.S).group(1)
        for s in re.findall(r":\s*'([^']*)'", block): keys.add(s)
    if rel.endswith('steps.ts'):
        block = re.search(r"STEP_NAMES[^{]*\{(.*?)\}", text, re.S).group(1)
        for s in re.findall(r":\s*'([^']*)'", block): keys.add(s)
    if rel.endswith('IntroScreen.tsx'):
        block = re.search(r"TUTORIAL = \[(.*?)\n\]", text, re.S).group(1)
        for s in re.findall(r"^\s*'([^']*)'", block, re.M): keys.add(s)
    if rel.endswith('ProfileScreen.tsx'):
        for s in re.findall(r"\['pf-sec-[a-z]+', '([^']*)'\]", text): keys.add(s)
        m = re.search(r"GENDERS = \[(.*?)\]", text)
        for s in re.findall(r"'([^']*)'", m.group(1)): keys.add(s)

# Application stages and job statuses, shown through t()
keys |= {'New', 'Reviewed', 'Interviewing', 'Hired', 'Rejected', 'Paused', 'Closed', 'Being updated', 'Active'}
# The consent checkbox labels (documents/legal.ts consentLabel) and the document names
text = open(os.path.join(src, 'lib/documents/legal.ts'), encoding='utf-8').read()
for s in re.findall(r"\?\s*'(I have read[^']*)'|:\s*'(I have read[^']*)'|return '(I agree[^']*)'", text):
    for x in s:
        if x: keys.add(x)
keys |= {'Privacy Notice', 'Terms and Conditions', 'Accessibility'}
keys.discard('')

have = set()
if len(sys.argv) > 2 and os.path.exists(sys.argv[2]):
    ftext = open(sys.argv[2], encoding='utf-8').read()
    have = set(json.loads('"' + k + '"') for k in re.findall(r'^\s*"((?:[^"\\]|\\.)*)":', ftext, re.M))
missing = sorted(keys - have)
for k in missing: print(json.dumps(k, ensure_ascii=False))
print(f'-- {len(keys)} keys, {len(missing)} missing', file=sys.stderr)
