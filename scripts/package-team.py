from pathlib import Path
import zipfile
import sys
ROOT=Path(__file__).resolve().parents[1]
DEFAULT=ROOT.parent/'PERDTU-team.zip'
EXCLUDE_DIRS={'node_modules','.next','dist','storage','.superpowers','.git','.agents','.codex','__pycache__','apps'}
ROOT_FILES={'README.md','package.json','docker-compose.yml','.gitignore'}
ROOT_DIRS={'frontend','backend','scripts','docs'}
def excluded(path):
    rel=path.relative_to(ROOT)
    if any(part in EXCLUDE_DIRS for part in rel.parts): return True
    if len(rel.parts)>1 and rel.parts[:2]==('docs','superpowers'): return True
    if path.name.startswith('.env') and path.name!='.env.example': return True
    return path.suffix in {'.log','.pyc','.tsbuildinfo','.zip'} or path.name in {'next-env.d.ts'}
def package(target):
    count=0
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
        import os
        for current,dirs,files in os.walk(ROOT,followlinks=False):
            parent=Path(current)
            dirs[:]=[name for name in dirs if not excluded(parent/name) and (parent!=ROOT or name in ROOT_DIRS)]
            for name in files:
                path=parent/name
                if parent==ROOT and name not in ROOT_FILES: continue
                if path.is_symlink() or excluded(path): continue
                archive.write(path,Path('PERDTU')/path.relative_to(ROOT));count+=1
    with zipfile.ZipFile(target) as archive:
        names=set(archive.namelist())
        for needed in ['PERDTU/README.md','PERDTU/frontend/package-lock.json','PERDTU/backend/package-lock.json','PERDTU/frontend/.env.example','PERDTU/backend/.env.example','PERDTU/scripts/setup.mjs','PERDTU/backend/prisma/schema.prisma']:
            assert needed in names,needed
        assert not any(excluded(ROOT/Path(name).relative_to('PERDTU')) for name in names)
        assert archive.testzip() is None
    print(f'Created {target.name}: {count} files, {target.stat().st_size:,} bytes; exclusions and CRC verified.')
if __name__=='__main__':
    target=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else DEFAULT
    if target.parent!=ROOT.parent: raise SystemExit('Package output must stay in the named workspace parent.')
    package(target)
