import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Bell,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronRight,
  Heart,
  Mail,
  Search,
  Settings,
  Sparkles,
  Star,
  Trash,
  User,
  Bold,
  Italic,
  Underline,
} from "lucide-react";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/design-system")({
  head: () => ({
    meta: [
      { title: "Design System — Postly" },
      {
        name: "description",
        content: "Showcase de componentes, cores e tipografia do design system Postly.",
      },
    ],
  }),
  component: DesignSystemPage,
});

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="py-12 border-t first:border-t-0">
      <div className="mb-8">
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        {description && <p className="mt-2 text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Demo({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      {title && <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>}
      <div className="flex flex-wrap items-start gap-4">{children}</div>
    </div>
  );
}

function Swatch({ name, varName, className }: { name: string; varName: string; className: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={cn("h-20 w-full rounded-lg border shadow-sm", className)} />
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{varName}</p>
      </div>
    </div>
  );
}

const formSchema = z.object({
  username: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("E-mail inválido"),
});

function DesignSystemPage() {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [progress, setProgress] = React.useState(45);
  const [sliderValue, setSliderValue] = React.useState([60]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", email: "" },
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="border-b bg-gradient-primary-soft">
        <div className="container mx-auto px-6 py-16">
          <div className="mb-6 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary shadow-primary" />
              <span className="text-xl font-bold tracking-tight">Postly</span>
            </Link>
            <Button variant="gradient">Entrar</Button>
          </div>
          <Badge variant="gradient" className="mb-4">
            <Sparkles className="mr-1 h-3 w-3" /> v1.0
          </Badge>
          <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
            <span className="text-gradient-primary">Design System</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
            Biblioteca completa de componentes, tokens e padrões visuais que dão vida ao Postly.
          </p>
        </div>
      </header>

      <div className="container mx-auto max-w-6xl px-6">
        {/* Cores */}
        <Section
          id="cores"
          title="Cores"
          description="Paleta derivada do gradiente rosa→magenta — identidade visual da marca."
        >
          <Demo title="Gradiente principal">
            <div className="flex w-full flex-col gap-3">
              <div className="flex h-32 w-full items-center justify-center rounded-2xl bg-gradient-primary shadow-primary-lg">
                <span className="text-2xl font-bold text-primary-foreground">Postly</span>
              </div>
              <code className="text-xs text-muted-foreground">
                --gradient-primary: linear-gradient(90deg, #FF2E63 → #FF1493)
              </code>
            </div>
          </Demo>

          <Demo title="Escala primary">
            <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-5">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => (
                <Swatch
                  key={n}
                  name={`primary-${n}`}
                  varName={`bg-primary-${n}`}
                  className={`bg-primary-${n}`}
                />
              ))}
            </div>
          </Demo>

          <Demo title="Tokens semânticos">
            <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
              <Swatch name="background" varName="--background" className="bg-background" />
              <Swatch name="foreground" varName="--foreground" className="bg-foreground" />
              <Swatch name="card" varName="--card" className="bg-card" />
              <Swatch name="primary" varName="--primary" className="bg-primary" />
              <Swatch name="secondary" varName="--secondary" className="bg-secondary" />
              <Swatch name="muted" varName="--muted" className="bg-muted" />
              <Swatch name="accent" varName="--accent" className="bg-accent" />
              <Swatch name="destructive" varName="--destructive" className="bg-destructive" />
              <Swatch name="border" varName="--border" className="bg-border" />
              <Swatch name="input" varName="--input" className="bg-input" />
              <Swatch name="ring" varName="--ring" className="bg-ring" />
              <Swatch name="popover" varName="--popover" className="bg-popover border-2" />
            </div>
          </Demo>
        </Section>

        {/* Tipografia */}
        <Section id="tipografia" title="Tipografia" description="Escala tipográfica e estilos de texto.">
          <Demo>
            <div className="w-full space-y-4">
              <h1 className="text-5xl font-bold tracking-tight">Heading 1 — 48px</h1>
              <h2 className="text-4xl font-bold tracking-tight">Heading 2 — 36px</h2>
              <h3 className="text-3xl font-semibold tracking-tight">Heading 3 — 30px</h3>
              <h4 className="text-2xl font-semibold">Heading 4 — 24px</h4>
              <h5 className="text-xl font-semibold">Heading 5 — 20px</h5>
              <h6 className="text-lg font-semibold">Heading 6 — 18px</h6>
              <p className="text-lg text-muted-foreground">
                Lead — texto introdutório maior, usado em hero sections e descrições importantes.
              </p>
              <p>
                Parágrafo padrão. O texto base do produto. <strong>Negrito</strong>, <em>itálico</em>,{" "}
                <a href="#" className="text-primary underline-offset-4 hover:underline">link</a> e{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">código inline</code>.
              </p>
              <p className="text-sm text-muted-foreground">Texto small / muted — 14px.</p>
              <p className="text-gradient-primary text-3xl font-bold">Texto com gradiente</p>
            </div>
          </Demo>
        </Section>

        {/* Botões */}
        <Section id="botoes" title="Botões" description="Variantes, tamanhos e estados.">
          <Demo title="Variantes">
            <Button variant="gradient">Entrar</Button>
            <Button variant="default">Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="destructive">Destructive</Button>
          </Demo>

          <Demo title="Tamanhos">
            <Button variant="gradient" size="sm">Small</Button>
            <Button variant="gradient" size="default">Default</Button>
            <Button variant="gradient" size="lg">Large</Button>
            <Button variant="gradient" size="xl">Extra Large</Button>
            <Button variant="gradient" size="icon">
              <Heart />
            </Button>
          </Demo>

          <Demo title="Com ícones e estados">
            <Button variant="gradient">
              <Sparkles /> Gerar com IA
            </Button>
            <Button variant="outline">
              <Mail /> Enviar
            </Button>
            <Button variant="destructive">
              <Trash /> Excluir
            </Button>
            <Button disabled>Desabilitado</Button>
            <Button variant="gradient" disabled>
              Desabilitado
            </Button>
          </Demo>
        </Section>

        {/* Inputs & Forms */}
        <Section id="forms" title="Inputs & Forms" description="Campos de entrada e validação.">
          <Demo title="Inputs">
            <div className="grid w-full gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ds-input">E-mail</Label>
                <Input id="ds-input" type="email" placeholder="voce@empresa.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ds-input-disabled">Desabilitado</Label>
                <Input id="ds-input-disabled" disabled placeholder="Não editável" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ds-textarea">Mensagem</Label>
                <Textarea id="ds-textarea" placeholder="Escreva sua mensagem..." />
              </div>
            </div>
          </Demo>

          <Demo title="Select, Checkbox, Radio, Switch, Slider">
            <div className="grid w-full gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Rede social</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="twitter">X / Twitter</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Plano</Label>
                <RadioGroup defaultValue="pro">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="free" id="r1" />
                    <Label htmlFor="r1">Grátis</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="pro" id="r2" />
                    <Label htmlFor="r2">Pro</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="ds-check" defaultChecked />
                <Label htmlFor="ds-check">Aceito os termos</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch id="ds-switch" defaultChecked />
                <Label htmlFor="ds-switch">Notificações</Label>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Frequência: {sliderValue[0]}%</Label>
                <Slider value={sliderValue} onValueChange={setSliderValue} max={100} step={1} />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Código de verificação</Label>
                <InputOTP maxLength={6}>
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
          </Demo>

          <Demo title="Form com validação (Zod)">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((v) => toast.success("Enviado!", { description: JSON.stringify(v) }))}
                className="w-full space-y-4"
              >
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuário</FormLabel>
                      <FormControl>
                        <Input placeholder="seu_usuario" {...field} />
                      </FormControl>
                      <FormDescription>Como você aparecerá no Postly.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="voce@empresa.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button variant="gradient" type="submit">Enviar</Button>
              </form>
            </Form>
          </Demo>

          <Demo title="Date Picker">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[260px] justify-start font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </Demo>
        </Section>

        {/* Display */}
        <Section id="display" title="Display" description="Componentes para exibir conteúdo.">
          <Demo title="Cards">
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>Plano Pro</CardTitle>
                <CardDescription>Para times que crescem rápido.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-gradient-primary">R$ 89/mês</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Posts ilimitados</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> 5 redes sociais</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> IA incluída</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="gradient" className="w-full">Assinar agora</Button>
              </CardFooter>
            </Card>
          </Demo>

          <Demo title="Badges">
            <Badge variant="gradient">Gradient</Badge>
            <Badge>Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="soft">Soft</Badge>
            <Badge variant="outline">Outline</Badge>
            <Badge variant="destructive">Destructive</Badge>
          </Demo>

          <Demo title="Avatar">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback className="bg-gradient-primary text-primary-foreground">PO</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </Demo>

          <Demo title="Progress & Skeleton">
            <div className="w-full space-y-4">
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>Carregando</span>
                  <span className="text-muted-foreground">{progress}%</span>
                </div>
                <Progress value={progress} />
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setProgress((p) => Math.max(0, p - 10))}>−</Button>
                  <Button size="sm" variant="outline" onClick={() => setProgress((p) => Math.min(100, p + 10))}>+</Button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </div>
          </Demo>

          <Demo title="Aspect Ratio">
            <div className="w-full max-w-md">
              <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-xl bg-gradient-primary">
                <div className="flex h-full items-center justify-center text-2xl font-bold text-primary-foreground">
                  16 / 9
                </div>
              </AspectRatio>
            </div>
          </Demo>

          <Demo title="Separator">
            <div className="w-full">
              <p>Acima do separador</p>
              <Separator className="my-4" />
              <p>Abaixo do separador</p>
            </div>
          </Demo>

          <Demo title="Table">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Post</TableHead>
                  <TableHead>Rede</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Engajamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Lançamento da v2</TableCell>
                  <TableCell>Instagram</TableCell>
                  <TableCell><Badge variant="gradient">Publicado</Badge></TableCell>
                  <TableCell className="text-right">2.4k</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Dicas de growth</TableCell>
                  <TableCell>LinkedIn</TableCell>
                  <TableCell><Badge variant="secondary">Agendado</Badge></TableCell>
                  <TableCell className="text-right">—</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Bastidores</TableCell>
                  <TableCell>TikTok</TableCell>
                  <TableCell><Badge variant="soft">Rascunho</Badge></TableCell>
                  <TableCell className="text-right">—</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Demo>
        </Section>

        {/* Navegação */}
        <Section id="navegacao" title="Navegação" description="Tabs, breadcrumbs e menus.">
          <Demo title="Tabs">
            <Tabs defaultValue="posts" className="w-full">
              <TabsList>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="calendar">Calendário</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>
              <TabsContent value="posts" className="mt-4 text-sm text-muted-foreground">
                Lista dos seus posts publicados e agendados.
              </TabsContent>
              <TabsContent value="calendar" className="mt-4 text-sm text-muted-foreground">
                Visualize tudo em um calendário.
              </TabsContent>
              <TabsContent value="analytics" className="mt-4 text-sm text-muted-foreground">
                Métricas de engajamento.
              </TabsContent>
            </Tabs>
          </Demo>

          <Demo title="Breadcrumb">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/">Home</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="#">Workspace</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Design System</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </Demo>

          <Demo title="Pagination">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">1</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#" isActive>2</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink href="#">3</PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </Demo>

          <Demo title="Navigation Menu">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Produto</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[300px] gap-2 p-4">
                      <li>
                        <NavigationMenuLink className="block rounded-md p-3 hover:bg-accent">
                          <div className="font-medium">Agendamento</div>
                          <p className="text-sm text-muted-foreground">Programe seus posts.</p>
                        </NavigationMenuLink>
                      </li>
                      <li>
                        <NavigationMenuLink className="block rounded-md p-3 hover:bg-accent">
                          <div className="font-medium">IA</div>
                          <p className="text-sm text-muted-foreground">Gere conteúdo automaticamente.</p>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </Demo>

          <Demo title="Command (⌘K)">
            <Command className="w-full max-w-md rounded-lg border shadow">
              <CommandInput placeholder="Busque um comando..." />
              <CommandList>
                <CommandEmpty>Nenhum resultado.</CommandEmpty>
                <CommandGroup heading="Sugestões">
                  <CommandItem><Search className="mr-2 h-4 w-4" />Buscar posts</CommandItem>
                  <CommandItem><CalendarIcon className="mr-2 h-4 w-4" />Ver calendário</CommandItem>
                  <CommandItem><Settings className="mr-2 h-4 w-4" />Configurações</CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </Demo>
        </Section>

        {/* Overlays */}
        <Section id="overlays" title="Overlays" description="Diálogos, popovers e camadas flutuantes.">
          <Demo title="Dialog & Alert Dialog & Sheet & Drawer">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Novo post</DialogTitle>
                  <DialogDescription>Crie um novo post para suas redes.</DialogDescription>
                </DialogHeader>
                <Input placeholder="Título" />
                <DialogFooter>
                  <Button variant="gradient">Criar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Alert Dialog</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                  <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction>Continuar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline">Sheet</Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Configurações</SheetTitle>
                  <SheetDescription>Ajuste preferências do workspace.</SheetDescription>
                </SheetHeader>
              </SheetContent>
            </Sheet>

            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline">Drawer</Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Drawer</DrawerTitle>
                  <DrawerDescription>Abre de baixo para cima.</DrawerDescription>
                </DrawerHeader>
                <DrawerFooter>
                  <DrawerClose asChild>
                    <Button variant="outline">Fechar</Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          </Demo>

          <Demo title="Popover, Hover Card, Tooltip">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">Popover</Button>
              </PopoverTrigger>
              <PopoverContent>Conteúdo flutuante com mais informações.</PopoverContent>
            </Popover>

            <HoverCard>
              <HoverCardTrigger asChild>
                <Button variant="link">@postly</Button>
              </HoverCardTrigger>
              <HoverCardContent>
                <div className="flex items-center gap-3">
                  <Avatar><AvatarFallback className="bg-gradient-primary text-primary-foreground">PO</AvatarFallback></Avatar>
                  <div>
                    <p className="font-semibold">Postly</p>
                    <p className="text-sm text-muted-foreground">Automação de redes</p>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon">
                  <Bell />
                </Button>
              </TooltipTrigger>
              <TooltipContent>3 notificações</TooltipContent>
            </Tooltip>
          </Demo>

          <Demo title="Dropdown & Context Menu">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Menu <ChevronDown />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem><User className="mr-2 h-4 w-4" />Perfil</DropdownMenuItem>
                <DropdownMenuItem><Settings className="mr-2 h-4 w-4" />Configurações</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive"><Trash className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <ContextMenu>
              <ContextMenuTrigger asChild>
                <div className="flex h-20 w-60 cursor-context-menu items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground">
                  Clique com o botão direito
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem>Copiar</ContextMenuItem>
                <ContextMenuItem>Colar</ContextMenuItem>
                <ContextMenuItem>Excluir</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          </Demo>

          <Demo title="Accordion & Collapsible">
            <div className="w-full space-y-4">
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="item-1">
                  <AccordionTrigger>O que é o Postly?</AccordionTrigger>
                  <AccordionContent>
                    Plataforma SaaS para empresas automatizarem conteúdos nas redes sociais.
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Quais redes são suportadas?</AccordionTrigger>
                  <AccordionContent>Instagram, LinkedIn, X/Twitter, TikTok e Facebook.</AccordionContent>
                </AccordionItem>
              </Accordion>

              <Collapsible className="w-full rounded-lg border p-4">
                <CollapsibleTrigger className="flex w-full items-center justify-between text-sm font-medium">
                  Mostrar mais opções <ChevronRight className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 text-sm text-muted-foreground">
                  Conteúdo expandido aparece aqui.
                </CollapsibleContent>
              </Collapsible>
            </div>
          </Demo>

          <Demo title="Carousel">
            <Carousel className="w-full max-w-md">
              <CarouselContent>
                {[1, 2, 3].map((n) => (
                  <CarouselItem key={n}>
                    <div className="flex aspect-video items-center justify-center rounded-xl bg-gradient-primary text-3xl font-bold text-primary-foreground">
                      Slide {n}
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </Demo>

          <Demo title="Scroll Area">
            <ScrollArea className="h-40 w-full rounded-md border p-4">
              <div className="space-y-2 text-sm">
                {Array.from({ length: 20 }).map((_, i) => (
                  <p key={i}>Item {i + 1} — conteúdo de exemplo na área rolável.</p>
                ))}
              </div>
            </ScrollArea>
          </Demo>

          <Demo title="Toggle & Toggle Group">
            <Toggle aria-label="Estrela"><Star /></Toggle>
            <ToggleGroup type="multiple">
              <ToggleGroupItem value="bold" aria-label="Bold"><Bold /></ToggleGroupItem>
              <ToggleGroupItem value="italic" aria-label="Italic"><Italic /></ToggleGroupItem>
              <ToggleGroupItem value="underline" aria-label="Underline"><Underline /></ToggleGroupItem>
            </ToggleGroup>
          </Demo>
        </Section>

        {/* Feedback */}
        <Section id="feedback" title="Feedback" description="Comunicação de status e ações ao usuário.">
          <Demo title="Alerts">
            <div className="w-full space-y-4">
              <Alert>
                <Bell className="h-4 w-4" />
                <AlertTitle>Heads up!</AlertTitle>
                <AlertDescription>Você pode adicionar componentes ao seu app.</AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>Algo deu errado. Tente novamente.</AlertDescription>
              </Alert>
            </div>
          </Demo>

          <Demo title="Toasts (Sonner)">
            <Button onClick={() => toast("Notificação simples")}>Default</Button>
            <Button variant="gradient" onClick={() => toast.success("Post publicado!", { description: "Seu post foi publicado no Instagram." })}>
              Success
            </Button>
            <Button variant="destructive" onClick={() => toast.error("Falha ao publicar", { description: "Verifique sua conexão." })}>
              Error
            </Button>
            <Button variant="outline" onClick={() => toast.info("Agendamento criado")}>Info</Button>
          </Demo>
        </Section>

        <footer className="border-t py-12 text-center text-sm text-muted-foreground">
          <p>
            <Link to="/" className="text-primary hover:underline">← Voltar à home</Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
