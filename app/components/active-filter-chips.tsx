import Link from "next/link";

type SearchParams = Record<string, string | string[] | undefined>;

export function ActiveFilterChips({
  basePath,
  params,
  filters,
}:{
  basePath:string;
  params:SearchParams;
  filters:Array<{key:string;label:string;active?:boolean}>;
}) {
  const active=filters.filter(filter=>filter.active??Boolean(valueOf(params[filter.key])));
  if(!active.length)return null;
  return <nav aria-label="Aktive Filter" className="mt-3 flex flex-wrap items-center gap-2 text-xs">
    <span className="font-semibold text-[var(--color-text-muted)]">Aktive Filter:</span>
    {active.map(filter=><Link className="rounded-full border border-[var(--color-primary)] bg-[var(--color-primary-light)] px-3 py-1.5 font-semibold text-[var(--color-primary-dark)] hover:bg-white" href={withoutFilter(basePath,params,filter.key)} key={filter.key} title={`${filter.label} entfernen`}>{filter.label} ×</Link>)}
  </nav>;
}

function withoutFilter(basePath:string,params:SearchParams,keyToRemove:string){
  const query=new URLSearchParams();
  for(const [key,value] of Object.entries(params)){
    if(key===keyToRemove||key==="seite"||value===undefined)continue;
    const actual=valueOf(value);
    if(actual)query.set(key,actual);
  }
  const serialized=query.toString();
  return serialized?`${basePath}?${serialized}`:basePath;
}

function valueOf(value:string|string[]|undefined){return Array.isArray(value)?value[0]??"":value??""}
