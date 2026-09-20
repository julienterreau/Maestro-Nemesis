import { Button, Container, Heading, Html, Text } from "@react-email/components";

export default function EmailChangeConfirmation({ url }: { url: string }) {
  return (
    <Html>
      <Container>
        <Heading>Confirmer le nouvel e-mail</Heading>
        <Text>
          Cliquez sur le bouton pour confirmer le changement d’adresse e-mail
          de l’administrateur.
        </Text>
        <Button href={url}>Confirmer l’e-mail</Button>
      </Container>
    </Html>
  );
}
