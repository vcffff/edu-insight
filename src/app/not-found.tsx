import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <p className="mb-3 text-xs font-semibold text-primary">
        404 · СТРАНИЦА НЕ НАЙДЕНА
      </p>
      <h1 className="font-heading text-2xl font-semibold">
        Такого раздела нет в рабочем пространстве
      </h1>
      <p className="my-4 text-sm text-secondary">
        Вернитесь к обзору, чтобы продолжить анализ.
      </p>
      <Button asChild>
        <Link href="/">Вернуться к обзору</Link>
      </Button>
    </div>
  );
}
