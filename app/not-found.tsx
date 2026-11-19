import Link from "next/link";
import { TrackForm } from "@/components/track-form";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-16 sm:px-6">
      <div>
        <h1 className="font-display text-4xl">Nothing at this address</h1>
        <p className="mt-3 text-muted">
          That sector or protocol number is not in the Vale Claro catalog.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-pine underline-offset-4 hover:underline"
        >
          Back to the hub
        </Link>
      </div>
      <TrackForm />
    </div>
  );
}
