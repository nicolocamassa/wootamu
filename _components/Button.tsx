import { PropsWithChildren } from "react"
import { tv } from "tailwind-variants"

type buttonProps = PropsWithChildren<{
    color?: "primary" | "secondary"
}>

const button = tv({
    base: 'border-red-500 border-1 p-2 rounded rounded-xl hover:cursor-pointer hover:bg-red-500',
    variants: {
        color: {
            primary: '',
            secondary: ''
        }
    },
    defaultVariants: {
        color: "primary"
    }
})

export default function Button({color, children}: buttonProps){
    return (
        <button className={button({color})}>{ children }</button>
    )
}