import { Container, Heading, Html, Text } from "@react-email/components";

export default function PasswordChanged() {
  return (
    <Html>
      <Container>
        <Heading>Mot de passe modifié</Heading>
        <Text>
          Le mot de passe administrateur d’AI Cloud Local a bien été mis à jour.
          Si ce n’était pas vous, contactez-vous immédiatement.
        </Text>
      </Container>
    </Html>
  );
}
