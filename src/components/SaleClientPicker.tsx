import React, { useEffect, useId, useRef, useState } from 'react'
import { ChevronRight, Search, X } from 'lucide-react'
import type { Client } from '@/types'

function normalize(value: string) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR')
}

export function SaleClientPicker({ clients, onClose, onSelect, onAddClient }: {
  clients: Client[]
  onClose: () => void
  onSelect: (id: string) => void
  onAddClient: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const [query, setQuery] = useState('')
  const search = normalize(query.trim())
  const matches = clients
    .filter((client) => normalize(client.name).includes(search))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  const dismiss = () => {
    dialog.current?.close()
    onClose()
  }

  return (
    <dialog
      ref={dialog}
      className='workspace-picker'
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        dismiss()
      }}
    >
      <div className='workspace-picker-heading'>
        <div>
          <h2 id={titleId}>Nova venda</h2>
          <p>Selecione o cliente para registrar a venda.</p>
        </div>
        <button type='button' autoFocus className='agro-icon-button' aria-label='Cancelar nova venda' onClick={dismiss}>
          <X size={18} aria-hidden='true' />
        </button>
      </div>
      {clients.length ? (
        <>
          <label className='workspace-picker-search'>
            <Search size={17} aria-hidden='true' />
            <input
              type='search'
              name='cliente'
              autoComplete='off'
              aria-label='Buscar cliente'
              placeholder='Buscar cliente…'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <ul className='workspace-picker-list'>
            {matches.map((client) => (
              <li key={client.id}>
                <button type='button' onClick={() => { dismiss(); onSelect(client.id) }}>
                  <span>{client.name}</span>
                  <ChevronRight size={16} aria-hidden='true' />
                </button>
              </li>
            ))}
          </ul>
          {!matches.length && <p className='workspace-picker-empty' role='status'>Nenhum cliente encontrado.</p>}
        </>
      ) : (
        <div className='workspace-picker-empty'>
          <p>Cadastre um cliente para registrar sua primeira venda.</p>
          <button type='button' className='agro-primary-button' onClick={() => { dismiss(); onAddClient() }}>
            Cadastrar cliente
          </button>
        </div>
      )}
    </dialog>
  )
}
