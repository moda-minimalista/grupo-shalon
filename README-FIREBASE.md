# Grupo Shalom - configuração Firebase

## Recursos usados agora

- Firebase Authentication: login por e-mail e senha.
- Cloud Firestore: dados do painel e permissões.
- Firebase Hosting: site e painel.
- Firebase Storage: desativado. Fotos, vídeos e documentos são cadastrados por URL.

## Ativação inicial

1. No Firebase Console, abra **Authentication > Sign-in method** e habilite **E-mail/senha**.
2. Em **Firestore Database**, crie o banco em modo de produção.
3. Instale a CLI: `npm install -g firebase-tools`
4. Entre: `firebase login`
5. Na pasta do site: `firebase use grupo-shalon`
6. Publique regras e Hosting: `firebase deploy --only hosting,firestore`
7. Acesse `/admin.html`.
8. Clique em **Criar primeiro administrador** e preencha o formulário.

O primeiro administrador é criado automaticamente no Firebase Authentication e no documento `users/UID`. A mesma operação cria `settings/bootstrap`, impedindo que outra conta repita o processo.

Importante: faça essa criação imediatamente após o primeiro deploy. Sem Cloud Functions, o bootstrap é um processo inicial executado no navegador; por isso o marcador criado é permanente e nem administradores podem apagá-lo pelas regras.

## Usuários

O painel cria automaticamente cada nova conta no Authentication usando uma instância secundária do SDK e salva o perfil no Firestore. Se o perfil não puder ser salvo, a conta recém-criada é removida do Authentication para evitar registros incompletos. “Remover” desativa o perfil e bloqueia todo acesso pelas regras. Excluir definitivamente uma conta já existente do Authentication requer Admin SDK/Cloud Functions.

## Sem Storage

Os campos de fotos, vídeos, contratos e documentos aceitam URLs públicas. Não salve arquivos em base64 no Firestore. O arquivo `storage.rules` está preparado bloqueando todos os acessos, mas o Storage não faz parte do deploy atual. Quando o serviço for habilitado, altere `storageEnabled` em `firebase-config.js`, implemente o envio, adicione a seção `storage` ao `firebase.json` e publique regras específicas.

## Segurança

- Não altere as regras para `allow read, write: if true`.
- O `firebaseConfig` do front-end não é uma senha; a proteção real está nas regras e no Authentication.
- Cadastros públicos de leads são aceitos pelo site. Dados privados exigem perfil ativo.
- Configure App Check antes de abrir formulários públicos em produção.
