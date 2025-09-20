import { Plugin } from 'vite';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

export default function generateHtmlPlugin(): Plugin {
    return {
        name: 'generate-html-plugin',
        generateBundle(options, bundle) {
            const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <link rel="icon" href="./favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta
            name="description"
            content="Decentralized platform for DMD operations, offering tools for validator management, staking, DAO governance, and personalized user profiles to promote trust and stability in the DMD ecosystem."
    />
    <link rel="apple-touch-icon" href="./logo192.png" />
    <!--
      manifest.json provides metadata used when your web app is installed on a
      user's mobile device or desktop. See https://developers.google.com/web/fundamentals/web-app-manifest/
    -->
    <title>DMD Diamond</title>
    <link rel="stylesheet" href="./style.css" />
    <link rel="stylesheet" href="./custom.css" />
    <link rel="stylesheet" href="./webflow.css" />
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Exo:wght@100;200;300;400;500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap">
    <link href="https://assets-global.website-files.com/65fb610d7ccccdf955493bf9/css/diamond-ui-08aece.webflow.32cac197b.css" rel="stylesheet" type="text/css" />
</head>
<body>
<noscript>You need to enable JavaScript to run this app.</noscript>
<div id="root"></div>
<!-- The bundled React app will be injected into the "root" element -->
<script src="./diamond-ui.iife.js"></script>
<script src="https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=65fb610d7ccccdf955493bf9" type="text/javascript" integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0=" crossorigin="anonymous"></script>
<script src="https://assets-global.website-files.com/65fb610d7ccccdf955493bf9/js/webflow.8a05ea70d.js" type="text/javascript"></script>
</body>
</html>
      `.trim();

            // Determine the output directory (default is 'dist')
            const outputDir = typeof options.dir === 'string' ? options.dir : 'dist';
            const outputPath = resolve(outputDir, 'index.html');
            writeFileSync(outputPath, htmlContent, 'utf-8');
            console.log(`Generated ${outputPath}`);
        }
    };
}