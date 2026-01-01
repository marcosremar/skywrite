import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Habilitar standalone output apenas em produção
  ...(process.env.NODE_ENV === "production" && { output: "standalone" }),

  // Externalizar Prisma para evitar problemas com Turbopack
  serverExternalPackages: ["@prisma/client"],

  // Configuração do Turbopack (Next.js 16+ usa Turbopack por padrão)
  turbopack: {},

  // Headers de segurança
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
