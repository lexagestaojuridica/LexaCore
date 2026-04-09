# Vercel Configuration & MCP Guide (LEXA)

## 1. Configuração do Servidor MCP (Antigravity)

Para que eu (Antigravity) possa interagir com seus projetos no Vercel (conta **lexagestaojuridica-7277**), adicione a seguinte configuração ao seu arquivo de configurações de MCP:

```json
{
  "mcpServers": {
    "vercel": {
      "command": "npx",
      "args": ["-y", "@vercel/mcp-server"],
      "env": {
        "VERCEL_TOKEN": "SEU_TOKEN_AQUI"
      }
    }
  }
}
```

> [!TIP]
> Você pode gerar um token em [Vercel Settings > Tokens](https://vercel.com/account/tokens). Recomendo criar um token com escopo limitado ao projeto LEXA.

## 2. Mantendo o Desacoplamento

Para garantir que possamos trocar de provedor de hosting facilmente no futuro:

1. **Evite APIs Específicas**: Use `header`, `cookie` e `middleware` padrão do Next.js em vez de configurações no `vercel.json` sempre que possível.
2. **Edge Runtime**: Se usar Edge Functions, utilize o padrão do Next.js (`export const runtime = 'edge'`), que é compatível com Supabase Functions e Outros.
3. **Variáveis de Ambiente**: Mantenha o `.env.example` atualizado. Use o comando `vercel env pull` localmente apenas para sincronização, mas não dependa de nomes de variáveis proprietários.

## 3. Sincronização de Ambiente

Para puxar as variáveis do Vercel para o seu ambiente local de forma segura:

```bash
vercel env pull .env.local
```

Para enviar variáveis locais para o Vercel:

```bash
vercel env add NOME_DA_VARIAVEL
```
