// Usage : node tools/set-exe-icon.cjs <Kalis.exe> <icon.ico>
const ResEdit = require('resedit');
const fs = require('fs');
const [exePath, icoPath] = process.argv.slice(2);
const exe = ResEdit.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
const res = ResEdit.NtExecutableResource.from(exe);
const ico = ResEdit.Data.IconFile.from(fs.readFileSync(icoPath));
const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
const gid = groups.length ? groups[0].id : 1; const lang = groups.length ? groups[0].lang : 1033;
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, gid, lang, ico.icons.map((i) => i.data));
const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
if (vi) {
  vi.setStringValues({ lang: 1033, codepage: 1200 }, { FileDescription: 'Kalis', ProductName: 'Kalis', CompanyName: 'Paul MIKABISSI', LegalCopyright: 'Paul MIKABISSI', OriginalFilename: 'Kalis.exe', InternalName: 'Kalis' });
  vi.outputToResourceEntries(res.entries);
}
res.outputResource(exe);
fs.writeFileSync(exePath, Buffer.from(exe.generate()));
console.log('Icône mise à jour :', exePath);
