import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/clientes/$id/")({
  component: PerfilCliente,
});

type ClientFull = {
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  website: string | null;
  status: string;
  notes: string | null;
};

function PerfilCliente() {
  const { id } = Route.useParams();
  const [data, setData] = useState<ClientFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("clients")
      .select("name, company, email, phone, instagram, website, status, notes")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setData(data);
        setLoading(false);
      });
  }, [id]);

  const update = <K extends keyof ClientFull>(key: K, value: ClientFull[K]) => {
    setData((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    const { error } = await supabase.from("clients").update(data).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar.");
      return;
    }
    toast.success("Cliente atualizado!");
  };

  if (loading || !data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Dados de contato</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Nome">
            <Input value={data.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="Empresa">
            <Input value={data.company ?? ""} onChange={(e) => update("company", e.target.value)} />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={data.email ?? ""} onChange={(e) => update("email", e.target.value)} />
          </Field>
          <Field label="Telefone">
            <Input value={data.phone ?? ""} onChange={(e) => update("phone", e.target.value)} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Presença online</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Instagram">
            <Input value={data.instagram ?? ""} onChange={(e) => update("instagram", e.target.value)} placeholder="@usuario" />
          </Field>
          <Field label="Website">
            <Input value={data.website ?? ""} onChange={(e) => update("website", e.target.value)} placeholder="https://" />
          </Field>
          <Field label="Status">
            <select
              value={data.status}
              onChange={(e) => update("status", e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="active">Ativo</option>
              <option value="paused">Pausado</option>
              <option value="archived">Arquivado</option>
            </select>
          </Field>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Notas internas</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.notes ?? ""}
            onChange={(e) => update("notes", e.target.value)}
            rows={4}
            placeholder="Observações que só você vê."
          />
        </CardContent>
      </Card>

      <div className="md:col-span-2 flex justify-end">
        <Button variant="gradient" onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
