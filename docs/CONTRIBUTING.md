# CONTRIBUTING.md - Guia de Contribuição

## Bem-vindo ao LEXA

Obrigado pelo interesse em contribuir. Este guia garante que todos seguem os mesmos padrões de qualidade.

---

## Fluxo de Trabalho

### 1. Fork e Clone

```bash
git clone https://github.com/lexagestaojuridica/LexaCore.git
cd LexaCore
npm install
```

### 2. Criar branch

```bash
git checkout -b <tipo>/<descricao-curta>
```

**Tipos de branch:**

- `feat/` — nova funcionalidade
- `fix/` — correção de bug
- `docs/` — documentação
- `refactor/` — refatoração sem nova funcionalidade
- `test/` — adição ou correção de testes
- `chore/` — manutenção, CI/CD, dependências

**Exemplos:**

```text
feat/add-processo-search
fix/timesheet-calculation-error
docs/update-api-examples
```

### 3. Desenvolver seguindo os padrões

Consulte `ARCHITECTURE.md` e `SPECS.md` para detalhes.

- TypeScript `strict: true` obrigatório
- Zod para todas as validações
- Testes para toda lógica de negócio nova
- Sem `console.log` em produção

### 4. Commit com Conventional Commits

```bash
git commit -m "<tipo>(<escopo>): <descrição>"
```

**Tipos:**

- `feat` — nova funcionalidade
- `fix` — correção de bug
- `docs` — documentação
- `refactor` — refatoração
- `test` — testes
- `chore` — manutenção

**Exemplos:**

```text
feat(processos): add search by numero and cliente
fix(timesheet): correct hours calculation on DST change
docs(api): update supabase integration examples
test(auth): add tests for protected routes
```

### 5. Garantir qualidade antes do PR

```bash
# Lint
npm run lint

# Testes
npm run test

# Build
npm run build
```

### 6. Abrir Pull Request

Título seguindo Conventional Commits.

Template do PR:

```markdown
## Descrição
<!-- O que esta PR faz? -->

## Motivação
<!-- Por que essa mudança é necessária? -->

## Tipo de mudança
- [ ] Bug fix
- [ ] Nova feature
- [ ] Refatoração
- [ ] Documentação
- [ ] Testes

## Checklist
- [ ] Código segue os padrões do projeto (TypeScript strict, FSD)
- [ ] Testes adicionados/atualizados
- [ ] Lint passando
- [ ] Build passando
- [ ] Documentação atualizada (se necessário)
- [ ] PRD.md / SPECS.md atualizados (se necessário)
```

---

## Padrões de Código

### Componentes React

```typescript
// ✅ Correto - componente tipado, sem lógica de negócio
interface ProcessoCardProps {
  titulo: string;
  status: 'ativo' | 'arquivado';
  onEdit: (id: string) => void;
}

export function ProcessoCard({ titulo, status, onEdit }: ProcessoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{titulo}</CardTitle>
        <Badge variant={status === 'ativo' ? 'default' : 'secondary'}>
          {status}
        </Badge>
      </CardHeader>
    </Card>
  );
}

// ❌ Errado - lógica de negócio dentro de componente UI
export function ProcessoCard() {
  const { data } = useQuery(...); // Isso vai em useProcessos hook
  // ...
}
```

### Hooks

```typescript
// ✅ Correto - hook tipado com React Query
export function useProcessos(filtros?: ProcessoFiltros) {
  return useQuery({
    queryKey: ['processos', filtros],
    queryFn: () => processosService.listar(filtros),
    staleTime: 5 * 60 * 1000,
  });
}
```

### Validação

```typescript
// ✅ Correto - Zod schema centralizado em validators/
import { ProcessoSchema } from '@/shared/validators';

const form = useForm<Processo>({
  resolver: zodResolver(ProcessoSchema),
});
```

---

## Revisão de Código

Toda PR requer aprovação de pelo menos **um reviewer**.

O reviewer verifica:

- [ ] Funcionalidade implementada corretamente
- [ ] TypeScript sem erros
- [ ] Testes cobrem os casos principais
- [ ] Sem acoplamento entre features
- [ ] Segurança (sem dados sensíveis expostos, RLS respeitado)
- [ ] Performance (sem queries N+1, sem re-renders desnecessários)

---

## Dúvidas?

Consulte `DEVELOPMENT.md` para setup local ou abra uma Issue.
