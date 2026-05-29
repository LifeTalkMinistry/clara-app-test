# Emergency Fund + Wallet Deletion Architecture

## Core rule

Emergency Fund is not a standalone wallet.

Emergency Fund is a protected allocation inside a real wallet.

If the source wallet disappears, the active Emergency Fund allocation becomes invalid. CLARA may preserve history, but it must not preserve active money.

## Required behavior

When a wallet linked to Emergency Fund is deleted:

- clear the active wallet link fields
- keep raw history and audit records
- treat effective Emergency Fund amount as 0
- treat effective protected amount as 0
- treat effective months covered as 0
- show status as `Needs wallet`

The card copy should say:

- `Source wallet removed`
- `Relink Emergency Fund to continue`

## History rule

Never delete historical records.

A historical record may continue to show:

```txt
Emergency Fund Deposit
From: BDO Wallet (Deleted)
Amount: ₱5,000
```

History remains.
Money does not.

## Wallet recent activity rule

The wallet side should show money leaving the wallet:

```txt
Transfer to Emergency Fund
-₱5,000
```

Emergency Fund history should show money entering protected allocation:

```txt
Deposit from BDO Wallet
+₱5,000
```

## CLARA AI rule

If the linked wallet exists, CLARA may say:

```txt
You have ₱3,000 protected inside your BDO wallet.
```

If the linked wallet is deleted, CLARA must say:

```txt
I found Emergency Fund history, but the linked wallet no longer exists. Relink the Emergency Fund before it can be used again.
```

Orphaned Emergency Fund history must not be counted as spendable money, protected money, or available funds.

## Do not implement

Do not create a standalone Emergency Fund wallet.
Do not use localStorage.
Do not delete history to fix active balance math.
