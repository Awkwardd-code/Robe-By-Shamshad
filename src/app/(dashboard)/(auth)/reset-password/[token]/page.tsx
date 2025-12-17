import ResetPassword from "../_components/ResetPassword";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function Page({ params }: PageProps) {
  const { token } = await params;
  return <ResetPassword initialToken={token ?? ""} />;
}
