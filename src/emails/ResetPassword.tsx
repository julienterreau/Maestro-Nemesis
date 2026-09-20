import { Button, Container, Heading, Html, Text } from "@react-email/components";

export default function ResetPassword({ url }: { url: string }) {
  return (
    <Html>
      <Container>
        <Heading>Réinitialiser le mot de passe</Heading>
        <Text>
          Une demande de réinitialisation a été faite depuis le tableau de bord
          admin d’AI Cloud Local.
        </Text>
        <Button href={url}>Choisir un nouveau mot de passe</Button>
        <Text>Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</Text>
      </Container>
    </Html>
  );
}
