import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig} from 'vite';

function supabaseConfigPlugin() {
  const configPath = path.resolve(__dirname, 'public/supabase-config.json');
  return {
    name: 'supabase-config-handler',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url ? req.url.split('?')[0] : '';
        if (url === '/api/supabase-config') {
          if (req.method === 'GET') {
            let config = {
              url: process.env.VITE_SUPABASE_URL || '',
              anonKey: process.env.VITE_SUPABASE_ANON_KEY || ''
            };
            if ((!config.url || !config.anonKey) && fs.existsSync(configPath)) {
              try {
                const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (fileConfig.url) config.url = fileConfig.url;
                if (fileConfig.anonKey) config.anonKey = fileConfig.anonKey;
              } catch (e) {}
            }
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(config));
            return;
          }
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body || '{}');
                const safeConfig = {
                  url: String(parsed.url || '').trim(),
                  anonKey: String(parsed.anonKey || '').trim()
                };
                fs.writeFileSync(configPath, JSON.stringify(safeConfig, null, 2), 'utf8');
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, config: safeConfig }));
              } catch (err: any) {
                res.statusCode = 400;
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            });
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), supabaseConfigPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
