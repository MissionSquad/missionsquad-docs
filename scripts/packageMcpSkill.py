#!/usr/bin/env python3
"""Build or check the portable desktop skill ZIP using only Python's standard library."""

import argparse
import io
from pathlib import Path
import re
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Fail if the committed ZIP is stale.')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    source = root / 'public/downloads/skills/msq-config-agent'
    output = root / 'public/downloads/msq-config-agent.zip'
    files = sorted(path for path in source.rglob('*') if path.is_file())
    manifest = source / 'SKILL.md'
    if manifest not in files:
        parser.error('Missing SKILL.md')
    content = manifest.read_text(encoding='utf-8')
    # This bundle deliberately uses only two single-line, plain YAML scalars.
    # Reject other forms instead of attempting a partial general YAML parser.
    metadata = re.match(
        r'\A---\nname: ([a-z0-9]+(?:-[a-z0-9]+)*)\ndescription: ([A-Za-z][^\n]*)\n---\n',
        content,
    )
    if not metadata:
        parser.error('Use name and description as single-line plain YAML scalars in SKILL.md')
    name, description = metadata.groups()
    if name != source.name or len(name) > 64:
        parser.error('Skill name must match its folder and be at most 64 characters')
    if len(description) > 200 or ': ' in description or ' #' in description:
        parser.error('Description must be a plain YAML string of at most 200 characters for Claude')
    for ref in re.findall(r'`(references/[^`]+\.md)`', content):
        if not (source / ref).is_file():
            parser.error(f'Missing resource: {ref}')

    buffer = io.BytesIO()
    with ZipFile(buffer, 'w') as archive:
        for path in files:
            if path.is_symlink() or path.suffix != '.md':
                parser.error(f'Unexpected skill resource: {path.relative_to(source)}')
            name = (Path(source.name) / path.relative_to(source)).as_posix()
            entry = ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            entry.compress_type = ZIP_DEFLATED
            entry.create_system = 3
            entry.external_attr = 0o100644 << 16
            archive.writestr(entry, path.read_bytes())

    if args.check:
        if not output.is_file() or output.read_bytes() != buffer.getvalue():
            parser.error('Skill ZIP is missing or stale; run python3 scripts/packageMcpSkill.py')
        print(f'Verified {len(files)} skill files in {output.relative_to(root)}')
    else:
        output.write_bytes(buffer.getvalue())
        print(f'Packaged {len(files)} skill files into {output.relative_to(root)}')


if __name__ == '__main__':
    main()
