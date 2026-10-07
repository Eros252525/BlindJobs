export function ErrorMsg({ msg, id }: { msg: string; id?: string }) {
  return msg ? (
    <p id={id} role="alert" className="mt-2 flex items-start gap-1.5 text-[#b91c1c] text-base font-medium">
      <span aria-hidden="true">⚠</span><span>{msg}</span>
    </p>
  ) : null
}
