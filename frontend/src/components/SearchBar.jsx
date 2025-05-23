import React from "react"
import { Input } from "@/components/ui/input"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons"

const SearchBar = () => {
  return (
    <div
      className="
        flex items-center gap-3 
        w-full max-w-md 
        px-4 py-2 
        rounded-full 
        border border-border 
        bg-muted 
        shadow-sm 
        transition-all
        focus-within:ring-2 focus-within:ring-ring
      ">
      <FontAwesomeIcon
        icon={faMagnifyingGlass}
        className="text-muted-foreground text-sm"
      />

      <Input
        type="text"
        placeholder="Search..."
        className="
          w-full 
          !bg-muted 
          text-foreground 
          placeholder:text-muted-foreground 
          focus:outline-none 
          border-none 
          ring-0 
          !outline-none 
          !focus:ring-0
          !focus:border-none
          shadow-none
        "
      />
    </div>
  )
}

export default SearchBar
