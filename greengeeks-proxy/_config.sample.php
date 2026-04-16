<?php
// Rename to _config.php and fill in the real values before uploading
// to GreenGeeks. The leading underscore + the .htaccess rule in this
// folder stop the file from being served over HTTP — even though
// .php files aren't usually public, belt-and-braces is cheap here.

// FatSecret OAuth 2.0 credentials — from https://platform.fatsecret.com
define('FATSECRET_CLIENT_ID',     'paste-client-id-here');
define('FATSECRET_CLIENT_SECRET', 'paste-client-secret-here');

// Shared secret between Netlify Function and this proxy. Must match
// FATSECRET_PROXY_SECRET env var in Netlify. Generate a long random
// string — openssl rand -hex 32, or any password generator.
define('FATSECRET_PROXY_SECRET', 'paste-long-random-string-here');
