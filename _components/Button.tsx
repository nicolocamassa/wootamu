import { PropsWithChildren } from "react"
import { tv } from "tailwind-variants"
import Link from "next/link";

type ButtonProps = PropsWithChildren<{
    color?: "primary" | "secondary";
    href?: string;
    onClick?: React.MouseEventHandler<HTMLElement>;
    disabled?: boolean;
}>

const button = tv({
    base: 'py-4 font-bold text-stone-400 rounded-2xl hover:cursor-pointer hover:bg-red-500 w-full',
    variants: {
        color: {
            primary: 'bg-purple-800 text-white',
            secondary: 'bg-stone-950'
        },
        disabled: {
            true: 'opacity-50 cursor-not-allowed pointer-events-none hover:bg-transparent'
        }
    },
    defaultVariants: {
        color: "primary"
    }
})

export default function Button({ color, children, href, onClick, disabled }: ButtonProps) {
    if (href) {
        return (
            <Link className={button({ color, disabled })} href={href} onClick={onClick}>
                {children}
            </Link>
        );
    }

    return (
        <button
            className={button({ color, disabled })}
            onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
            disabled={disabled}
        >
            {children}
        </button>
    );
}