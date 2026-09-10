// electron-builder hook. Runs after the .app is assembled and before it is
// zipped, which is the only moment an ad-hoc signature can end up inside the
// artifact rather than having to be applied by hand afterwards.
//
// electron-builder has no ad-hoc signing of its own — grep app-builder-lib for
// "adhoc" and there is nothing. Without a real Apple identity it logs "skipped
// macOS code signing" whichever host built it, and Apple Silicon then refuses to
// launch the result, killing it with no message that looks like anything but a
// crash in the app's own code. So we sign here.
const { execFileSync } = require('child_process')
const path = require('path')

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return

  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)

  if (process.platform !== 'darwin') {
    console.log(`  • ad-hoc signing skipped — codesign exists only on macOS.`)
    console.log(`    Run ./install-on-mac.sh on the Mac, or the app will not launch.`)
    return
  }

  console.log(`  • ad-hoc signing  ${path.basename(app)}`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' })
}
