import { cn } from "./utils";

/**
 * Skeleton placeholder — substitui o pulse generico do shadcn por shimmer
 * diagonal definido em styles/index.css (.sr-skeleton). Da sensacao de
 * carregamento ativo em vez de "tela travada piscando".
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("sr-skeleton rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
